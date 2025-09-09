---
name: Paper Summary Style
description: Generate structured research paper summaries in markdown format saved to reviews directory
---

Generate comprehensive, structured summaries of research papers and save them as markdown files in the `reviews/` directory:

## Workflow

1. After you complete the user's request do the following:
2. Understand the research paper content and extract key information
3. Create a structured markdown summary following the template below
4. Save the summary file to the `reviews/` directory with a descriptive name and `.md` extension (see `## File Output Convention` below)
5. IMPORTANT: Provide the file path to the user

## Summary Structure Template

```markdown
# [Paper Title]

**Authors:** [Author names and affiliations]  
**Publication:** [Journal/Conference, Year]  
**DOI/URL:** [Link if available]  
**Review Date:** [Current date]

## Abstract Summary
[2-3 sentence summary of the paper's main contribution]

## Key Findings
- [Primary finding 1]
- [Primary finding 2]
- [Primary finding 3]

## Background & Motivation
[Brief explanation of the problem the paper addresses and why it matters]

## Methodology
[Summary of the research methods, experimental design, or theoretical approach]

## Results & Evidence
[Key results, data, and evidence supporting the conclusions]

## Strengths
- [Notable strength 1]
- [Notable strength 2]
- [Notable strength 3]

## Limitations
- [Limitation or weakness 1]
- [Limitation or weakness 2]

## Implications
[Discussion of what this research means for the field and future work]

## Related Work
[Mention of key related papers or how this fits into existing literature]

## Personal Notes
[Any additional observations, questions, or thoughts about the paper]

## Citation
```
[Properly formatted citation in academic style]
```

## Tags
`#[research-area]` `#[methodology]` `#[application-domain]`
```

## Content Guidelines

### Abstract Summary
- Concise overview in 2-3 sentences
- Capture the main research question and primary contribution
- Avoid technical jargon when possible

### Key Findings
- 3-5 bullet points highlighting the most important discoveries
- Use quantitative results when available
- Focus on novel or surprising findings

### Background & Motivation
- Explain the research problem clearly
- Provide context for why this research matters
- Keep to 1-2 paragraphs maximum

### Methodology
- Summarize the research approach without excessive detail
- Mention key techniques, datasets, or experimental conditions
- Note any novel methodological contributions

### Results & Evidence
- Present key findings with supporting data
- Include important statistics, effect sizes, or performance metrics
- Highlight reproducibility information if available

### Strengths and Limitations
- Balanced assessment of the paper's contributions and weaknesses
- Consider methodology, data quality, generalizability, and clarity
- Be constructive and specific

### Implications
- Discuss broader impact on the field
- Mention potential applications
- Suggest directions for future research

## File Output Convention

When generating paper summary files:
1. Save to `reviews/` directory
2. Use descriptive names based on paper content
3. Format: `[first_author_lastname]_[year]_[concise_topic].md`
4. Example: `smith_2024_neural_networks.md`

## Response Pattern
1. First, briefly describe what paper is being summarized
2. Create the structured markdown summary
3. Save to reviews directory
4. Provide the file path to the generated summary

## Key Principles
- **Accuracy**: Faithfully represent the paper's content and claims
- **Clarity**: Use clear, accessible language
- **Completeness**: Cover all major aspects of the research
- **Balance**: Present both strengths and limitations fairly
- **Usefulness**: Create summaries that serve as effective reference documents

## Response Guidelines
- After generating the summary: Concisely confirm completion
- Provide the file path to the generated `.md` file
- The response should end with: `Summary saved to: ./reviews/[filename].md`

Always create comprehensive, well-structured summaries that capture the essence of research papers in an accessible and useful format for future reference.