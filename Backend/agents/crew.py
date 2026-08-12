"""
agents/crew.py
--------------
This is the heart of the "multi-agent workflow" required by the spec.

We define 5 specialized AI agents, each with ONE job, and chain them
together with CrewAI so that the output of one agent becomes the input
of the next:

    1. context_reader          -> summarizes the raw input, flags gaps
    2. documentation_writer    -> writes the first draft
    3. technical_reviewer      -> checks the draft against the source
    4. tone_optimizer          -> rewrites for the right audience/voice
    5. publishing_coordinator  -> produces final structured JSON output

WHY SEPARATE AGENTS INSTEAD OF ONE BIG PROMPT?
- Each agent's prompt is small, focused, and easy to debug.
- You can see WHERE quality problems come from (e.g. bad draft vs bad tone).
- It matches the "Workflow Control" requirement in the PRD (section 3).

HOW TO EXTEND THIS LATER:
- Add retrieval (Chroma) results into the context_reader agent's input.
- Add a real "tool" (e.g. a style-guide search tool) to any agent.
- Swap the LLM model in get_llm() without touching agent logic.
"""

import json
import os

from crewai import Agent, Crew, Process, Task
from crewai.llm import LLM
from dotenv import load_dotenv

from retrieval.chroma_store import query_relevant
from services.context_builder import ContextBuilder

load_dotenv()


def get_llm() -> LLM:
    """
    Central place to configure which LLM the whole system uses.
    Change the model name here and every agent updates automatically.
    Using Gemini's free tier is a good default for a student project.
    """
    return LLM(
        model="gemini/gemini-flash-latest",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.4,
    )


def build_agents() -> dict:
    llm = get_llm()

    context_reader = Agent(
        role="Technical Context Reader",
        goal=(
    "Analyze only the provided source material and GitLab repository context. "
    "Produce an accurate technical summary, identify missing information, "
    "and never invent facts that are not supported by the provided sources."
),
        backstory=(
    "You are a senior Technical Context Analysis Agent for GitLab AI. "
    "Your responsibility is to analyze ONLY the provided repository data, "
    "README, commits, merge requests, uploaded documents, manual source text, "
    "and retrieved knowledge base entries.\n\n"

    "Rules:\n"
    "- Never invent or assume technical facts.\n"
    "- Never describe features that are not present in the provided sources.\n"
    "- If information is unavailable, explicitly state 'Information not available'.\n"
    "- Clearly distinguish verified facts from assumptions.\n"
    "- Base every statement only on the supplied repository context and documents.\n"
    "- Produce an objective and source-grounded technical summary."
),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )

    documentation_writer = Agent(
        role="Documentation Writer",
        
        goal=(
    "Generate professional documentation using ONLY the provided repository "
    "context, source material, uploaded documents and knowledge base. "
    "Do not invent facts, features or implementation details."
),
        backstory=(
    "You are a senior GitLab Technical Documentation Writer.\n\n"

    "Your responsibility is to convert verified repository information into "
    "clear, professional documentation.\n\n"

    "Rules:\n"
    "- Use ONLY information available in the supplied context.\n"
    "- Never invent features, APIs, commits or project details.\n"
    "- Never assume implementation details.\n"
    "- If information is missing, write 'Information not available' instead of guessing.\n"
    "- Preserve GitLab terminology and technical accuracy.\n"
    "- Clearly separate verified facts from assumptions.\n"
    "- Produce documentation suitable for developers and technical reviewers."
),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )

    technical_reviewer = Agent(
        role="Technical Reviewer",
        goal=(
    "Validate every technical statement in the generated draft against the "
    "provided repository context, source material, uploaded documents and "
    "knowledge base. Flag unsupported claims, missing evidence and potential "
    "hallucinations before publication."
),
        backstory=(
    "You are the Technical Validation Agent for GitLab AI.\n\n"

    "Your responsibility is to verify every statement before publication.\n\n"

    "Validation Rules:\n"
    "- Verify every claim against the provided repository context.\n"
    "- Verify against README, commits, merge requests, issues, uploaded documents and retrieved knowledge.\n"
    "- Never approve information that is not supported by evidence.\n"
    "- If a claim cannot be verified, classify it as a Risk Flag.\n"
    "- Suggest corrections using only the available source material.\n"
    "- Do not invent technical details while reviewing.\n"
    "- Clearly distinguish verified facts from assumptions."
),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )

    tone_optimizer = Agent(
        role="Tone and Style Editor",
        goal="Adjust the draft's tone and structure for the target audience and channel.",
        backstory=(
            "You are GitLab's voice and style expert. You know the difference "
            "between a developer blog, a reference doc, and a release note, and "
            "you rewrite content to fit the target channel without changing facts."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )

    publishing_coordinator = Agent(
        role="Publishing Coordinator",
        goal="Package the final content into clean structured JSON ready for review.",
        backstory=(
            "You prepare content for handoff to human reviewers. You always "
            "output valid JSON with title, sections, source references, "
            "assumptions, and risk flags — nothing else."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )

    return {
        "context_reader": context_reader,
        "documentation_writer": documentation_writer,
        "technical_reviewer": technical_reviewer,
        "tone_optimizer": tone_optimizer,
        "publishing_coordinator": publishing_coordinator,
    }


def run_content_workflow(
    content_type: str,
    audience: str,
    target_channel: str,
    source_text: str,
    title_hint: str | None = None,
    repository_summary: dict | None = None,
):
    """
    Runs the full 5-agent pipeline for one content job and returns a dict
    matching the fields we store on ContentJob.
    """

    agents = build_agents()

    # ---------------------------------------------------------
    # Retrieve relevant knowledge from Chroma
    # ---------------------------------------------------------
    retrieved = query_relevant(source_text, n_results=3)

    if retrieved:
        knowledge_block = "\n\n".join(
            f"[Source: {r['source']}]\n{r['content']}"
            for r in retrieved
        )
    else:
        knowledge_block = "(No matching knowledge base entries found.)"

    # ---------------------------------------------------------
    # Repository Information
    # ---------------------------------------------------------
    repository_block = ""

    if repository_summary:

        repository_block = f"""
REPOSITORY INFORMATION

Repository:
{repository_summary.get("repository_name")}

Default Branch:
{repository_summary.get("default_branch")}

README

{repository_summary.get("readme")}

Recent Commits

{chr(10).join(repository_summary.get("recent_commits", []))}

Merge Requests

{chr(10).join(repository_summary.get("merge_requests", []))}

Issues

{chr(10).join(repository_summary.get("issues", []))}
"""

    # ---------------------------------------------------------
    # Context Reader Task
    # ---------------------------------------------------------
    task_context = Task(
        description=(

            f"Read the following raw source material for a '{content_type}' "
            f"aimed at audience '{audience}'.\n\n"

            f"SOURCE MATERIAL:\n{source_text}\n\n"

            f"RELEVANT KNOWLEDGE BASE ENTRIES (style guides, templates, "
            f"existing documentation):\n"
            f"{knowledge_block}\n\n"

            f"{repository_block}\n\n"

            "Produce:\n"
            "1. A concise summary of the repository.\n"
            "2. Important recent changes.\n"
            "3. Missing information, assumptions or risks.\n"
        ),
        expected_output=(
            "Repository summary followed by missing information."
        ),
        agent=agents["context_reader"],
    )

    task_draft = Task(
        description=(
            f"Using ONLY the context from the previous step, write a first draft "
            f"of a {content_type} for audience '{audience}', intended for channel "
            f"'{target_channel}'. Working title hint: '{title_hint or 'none given'}'. "
            "Include a title and clearly separated sections."
        ),
        expected_output="A draft with a title and 2-5 sections of body text.",
        agent=agents["documentation_writer"],
        context=[task_context],
    )

    task_review = Task(
        description=(
            "Review the draft from the previous step against the original context. "
            "List any claim that is NOT clearly supported by the source material as "
            "a 'risk flag'. If everything is supported, say so explicitly."
        ),
        expected_output="A bullet list of risk flags (or 'No unsupported claims found').",
        agent=agents["technical_reviewer"],
        context=[task_context, task_draft],
    )

    task_tone = Task(
        description=(
            f"Rewrite the draft's language and structure to properly fit a "
            f"'{content_type}' for the '{target_channel}' channel and "
            f"'{audience}' audience, WITHOUT changing any facts. Keep the risk "
            "flags from the review step in mind — do not remove flagged claims, "
            "just make sure the wording is accurate."
        ),
        expected_output="The final, tone-adjusted draft with title and sections.",
        agent=agents["tone_optimizer"],
        context=[task_draft, task_review],
    )

    task_publish = Task(
        description=(
            "Take the final tone-adjusted draft and package it as STRICT JSON "
            "with exactly these keys: "
            '"title" (string), "sections" (array of {"heading": string, "body": string}), '
            '"source_references" (array of short strings describing which part of the '
            'source each section relies on), "assumptions" (array of strings), '
            '"risk_flags" (array of strings, from the technical review step). '
            "Output ONLY the JSON object, no extra commentary, no markdown code fences."
        ),
        expected_output="A single valid JSON object as plain text.",
        agent=agents["publishing_coordinator"],
        context=[task_tone, task_review],
    )

    crew = Crew(
        agents=list(agents.values()),
        tasks=[task_context, task_draft, task_review, task_tone, task_publish],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    raw_output = str(result)

    # The publishing_coordinator is asked for strict JSON. We try to parse it;
    # if the model added stray text around it, we fall back gracefully so the
    # API never crashes — this matters a lot for a student project demo.
    try:
        cleaned = raw_output.strip().strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        parsed = {
            "title": title_hint or "Untitled Draft",
            "sections": [{"heading": "Draft", "body": raw_output}],
            "source_references": [],
            "assumptions": ["Publishing agent did not return valid JSON — raw text shown."],
            "risk_flags": [],
        }

    # Merge the LLM-generated source_references with the actual retrieved
    # knowledge base sources, so reviewers can see real grounding, not just
    # whatever the model claims it used.
    retrieved_sources = [r["source"] for r in retrieved]
    combined_references = list(
        dict.fromkeys(parsed.get("source_references", []) + retrieved_sources)
    )

    return {
        "context_summary": str(task_context.output) if task_context.output else "",
        "draft_title": parsed.get("title", title_hint or "Untitled Draft"),
        "draft_content": _sections_to_markdown(parsed.get("sections", [])),
        "source_references": combined_references,
        "assumptions": parsed.get("assumptions", []),
        "risk_flags": parsed.get("risk_flags", []),
    }


def _sections_to_markdown(sections: list[dict]) -> str:
    parts = []
    for s in sections:
        heading = s.get("heading", "").strip()
        body = s.get("body", "").strip()
        if heading:
            parts.append(f"## {heading}\n\n{body}")
        else:
            parts.append(body)
    return "\n\n".join(parts)
