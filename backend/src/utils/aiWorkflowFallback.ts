export const buildFallbackWorkflow = (prompt: string) => ({
  title: `${prompt.replace(/^create\s+/i, "").trim()} workflow`,
  description: `AI-derived workflow generated from prompt: ${prompt}`,
  stages: [
    {
      name: "Planning",
      order: 1,
      tasks: [
        { title: "Define scope", priority: "high", daysFromNow: 1 },
        { title: "Identify stakeholders", priority: "medium", daysFromNow: 2 }
      ]
    },
    {
      name: "Execution",
      order: 2,
      tasks: [
        { title: "Execute operational steps", priority: "high", daysFromNow: 4 },
        { title: "Review progress", priority: "medium", daysFromNow: 6 }
      ]
    },
    {
      name: "Closure",
      order: 3,
      tasks: [{ title: "Finalize and report", priority: "medium", daysFromNow: 8 }]
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
});

