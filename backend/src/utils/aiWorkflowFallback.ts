const normalizeTitle = (prompt: string) => {
  const cleaned = prompt.replace(/^create\s+/i, "").replace(/\s+workflow$/i, "").trim();
  return cleaned ? `${cleaned} workflow` : "Generated workflow";
};

const buildEmployeeOnboardingWorkflow = (prompt: string) => ({
  title: "Employee onboarding workflow",
  description: `Structured onboarding plan generated from prompt: ${prompt}`,
  stages: [
    {
      name: "Pre-boarding",
      order: 1,
      tasks: [
        { title: "Collect government ID and signed offer letter", priority: "high" as const, daysFromNow: 1 },
        { title: "Verify address, tax, and education documents", priority: "high" as const, daysFromNow: 2 }
      ]
    },
    {
      name: "Account Setup",
      order: 2,
      tasks: [
        { title: "Create email, HRIS, VPN, Git, and project management accounts", priority: "high" as const, daysFromNow: 2 },
        { title: "Provision laptop access, SSO, and required engineering tools", priority: "high" as const, daysFromNow: 3 }
      ]
    },
    {
      name: "Team Introduction",
      order: 3,
      tasks: [
        { title: "Schedule manager introduction and first-week team meet-and-greet", priority: "medium" as const, daysFromNow: 3 },
        { title: "Share role expectations, onboarding plan, and communication channels", priority: "medium" as const, daysFromNow: 4 }
      ]
    },
    {
      name: "Training",
      order: 4,
      tasks: [
        { title: "Complete secure coding, architecture, and repository training", priority: "medium" as const, daysFromNow: 5 },
        { title: "Finish starter engineering tasks and development environment checklist", priority: "medium" as const, daysFromNow: 7 }
      ]
    },
    {
      name: "Probation Review",
      order: 5,
      tasks: [
        { title: "Run 30-day progress check with manager", priority: "medium" as const, daysFromNow: 30 },
        { title: "Complete probation review and confirm next-step goals", priority: "high" as const, daysFromNow: 90 }
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
    title: normalizeTitle(prompt),
    description: `AI-derived workflow generated from prompt: ${prompt}`,
    stages: [
      {
        name: "Planning",
        order: 1,
        tasks: [
          { title: "Define scope", priority: "high" as const, daysFromNow: 1 },
          { title: "Identify stakeholders", priority: "medium" as const, daysFromNow: 2 }
        ]
      },
      {
        name: "Execution",
        order: 2,
        tasks: [
          { title: "Execute operational steps", priority: "high" as const, daysFromNow: 4 },
          { title: "Review progress", priority: "medium" as const, daysFromNow: 6 }
        ]
      },
      {
        name: "Closure",
        order: 3,
        tasks: [{ title: "Finalize and report", priority: "medium" as const, daysFromNow: 8 }]
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
