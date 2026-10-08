const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const cleanPromptText = (prompt: string) =>
  prompt
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/requirements?:[\s\S]*$/i, " ")
    .replace(/output format:[\s\S]*$/i, " ")
    .replace(/act as [^.?!:]+[.?!:]\s*/i, "")
    .replace(/help me (design|build|create)\s+/i, "")
    .replace(/create\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const extractWorkflowTopic = (prompt: string) => {
  const explicitUseCase = prompt.match(/use case:\s*(.+?)(requirements?:|output format:|$)/i)?.[1]?.trim();
  const candidate = cleanPromptText(explicitUseCase || prompt);
  if (!candidate) {
    return "workflow";
  }

  const trimmed = candidate.replace(/\b(workflow|automation system|system)\b/gi, "").replace(/\s+/g, " ").trim();
  return trimmed || candidate;
};

export const summarizeWorkflowTitle = (prompt: string, generatedTitle?: string) => {
  const source = (generatedTitle || "").trim();
  const looksPromptLike =
    source.length > 80 || /requirements?:|output format:|act as |help me /i.test(source) || source.split(" ").length > 10;

  if (source && !looksPromptLike) {
    return source.replace(/\s+/g, " ").trim();
  }

  const topic = extractWorkflowTopic(prompt);
  const shortTopic = topic.split(" ").filter(Boolean).slice(0, 6).join(" ");
  const normalized = shortTopic || "Generated workflow";
  return `${toTitleCase(normalized)} Workflow`.replace(/\s+workflow\s+workflow$/i, " Workflow");
};

export const summarizeWorkflowDescription = (prompt: string, generatedDescription?: string) => {
  const source = (generatedDescription || "").trim();
  const looksPromptLike =
    source.length > 180 || /requirements?:|output format:|act as |help me /i.test(source) || source.split(" ").length > 24;

  if (source && !looksPromptLike) {
    return source.replace(/\s+/g, " ").trim();
  }

  const topic = extractWorkflowTopic(prompt);
  const cleanedTopic = topic.replace(/[.?!,:;]+$/, "").trim();
  return `AI-generated workflow for ${cleanedTopic || "the requested process"}.`;
};

const buildEmployeeOnboardingWorkflow = (prompt: string) => ({
  title: "Employee onboarding workflow",
  description: "AI-generated workflow for employee onboarding across documents, access, training, and review milestones.",
  stages: [
    {
      name: "Pre-boarding",
      order: 1,
      tasks: [
        {
          title: "Collect onboarding documents",
          description: "Gather the employee's government ID and signed offer letter so pre-boarding can begin.",
          priority: "high" as const,
          daysFromNow: 1
        },
        {
          title: "Verify employee records",
          description: "Check address, tax, and education documents for completeness and policy compliance.",
          priority: "high" as const,
          daysFromNow: 2
        }
      ]
    },
    {
      name: "Account Setup",
      order: 2,
      tasks: [
        {
          title: "Create employee accounts",
          description: "Set up email, HRIS, VPN, Git, and project management access for the new hire.",
          priority: "high" as const,
          daysFromNow: 2
        },
        {
          title: "Provision devices and tools",
          description: "Prepare laptop access, SSO, and the engineering tools required for day one.",
          priority: "high" as const,
          daysFromNow: 3
        }
      ]
    },
    {
      name: "Team Introduction",
      order: 3,
      tasks: [
        {
          title: "Schedule introductions",
          description: "Arrange the manager introduction and first-week team meet-and-greet sessions.",
          priority: "medium" as const,
          daysFromNow: 3
        },
        {
          title: "Share onboarding expectations",
          description: "Explain role expectations, the onboarding plan, and the main communication channels.",
          priority: "medium" as const,
          daysFromNow: 4
        }
      ]
    },
    {
      name: "Training",
      order: 4,
      tasks: [
        {
          title: "Complete core training",
          description: "Finish secure coding, architecture, and repository training needed for productive work.",
          priority: "medium" as const,
          daysFromNow: 5
        },
        {
          title: "Finish starter checklist",
          description: "Work through the first engineering tasks and confirm the development environment is ready.",
          priority: "medium" as const,
          daysFromNow: 7
        }
      ]
    },
    {
      name: "Probation Review",
      order: 5,
      tasks: [
        {
          title: "Run 30-day check-in",
          description: "Review the employee's first month progress with the manager and capture blockers.",
          priority: "medium" as const,
          daysFromNow: 30
        },
        {
          title: "Complete probation review",
          description: "Finalize the probation review and confirm the next set of goals and expectations.",
          priority: "high" as const,
          daysFromNow: 90
        }
      ]
    }
  ],
  automationRules: [
    {
      trigger: "documents.verified",
      action: "notify.it.to.start.account_setup"
    },
    {
      trigger: "account_setup.completed",
      action: "schedule.manager_introduction"
    },
    {
      trigger: "training.overdue",
      action: "remind.employee_and_manager"
    },
    {
      trigger: "probation_review.due",
      action: "notify.hr_and_manager"
    }
  ]
});

export const buildFallbackWorkflow = (prompt: string) => {
  const normalizedPrompt = prompt.trim().toLowerCase();

  if (normalizedPrompt.includes("employee onboarding") || normalizedPrompt.includes("software engineer joining")) {
    return buildEmployeeOnboardingWorkflow(prompt);
  }

  return {
    title: summarizeWorkflowTitle(prompt),
    description: summarizeWorkflowDescription(prompt),
    stages: [
      {
        name: "Planning",
        order: 1,
        tasks: [
          {
            title: "Define scope",
            description: "Clarify what the workflow should cover, what success looks like, and what is out of scope.",
            priority: "high" as const,
            daysFromNow: 1
          },
          {
            title: "Identify stakeholders",
            description: "List the people or teams who need to review, approve, or execute the workflow.",
            priority: "medium" as const,
            daysFromNow: 2
          }
        ]
      },
      {
        name: "Execution",
        order: 2,
        tasks: [
          {
            title: "Execute core steps",
            description: "Carry out the main operational work required to move the workflow forward.",
            priority: "high" as const,
            daysFromNow: 4
          },
          {
            title: "Review progress",
            description: "Check progress, identify blockers, and confirm the workflow is on track.",
            priority: "medium" as const,
            daysFromNow: 6
          }
        ]
      },
      {
        name: "Closure",
        order: 3,
        tasks: [
          {
            title: "Finalize and report",
            description: "Close the workflow, document outcomes, and share the final status with stakeholders.",
            priority: "medium" as const,
            daysFromNow: 8
          }
        ]
      }
    ],
    automationRules: [
      {
        trigger: "stage.completed",
        action: "notify.next.assignee"
      },
      {
        trigger: "task.overdue",
        action: "escalate.to.manager"
      }
    ]
  };
};
