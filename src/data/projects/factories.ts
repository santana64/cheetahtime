import type {
  Assignment,
  Baseline,
  BaselineTaskSnapshot,
  Dependency,
  Project,
  ProjectCalendar,
  Resource,
  Task,
} from "@/types/planning";

export function createCalendar(projectId: string, timezone: string): ProjectCalendar {
  return {
    id: `${projectId}-calendar`,
    name: "Delivery Calendar",
    timezone,
    workingDays: [1, 2, 3, 4, 5],
    hoursPerDay: 8,
    exceptions: [
      {
        id: `${projectId}-holiday-1`,
        date: "2026-05-01",
        label: "Labor Day",
        isWorkingDay: false,
      },
      {
        id: `${projectId}-holiday-2`,
        date: "2026-05-14",
        label: "Ascension Day",
        isWorkingDay: false,
      },
      {
        id: `${projectId}-working-sat`,
        date: "2026-05-16",
        label: "Cutover rehearsal Saturday",
        isWorkingDay: true,
      },
    ],
  };
}

export function createProject(
  base: Partial<Project> & Pick<Project, "id" | "slug" | "code" | "name">,
): Project {
  return {
    workspaceId: "workspace-cheetah-time",
    origin: "SEEDED",
    sourceProjectId: null,
    clientName: "Client",
    description: "",
    portfolio: "Strategic Delivery",
    ownerUserId: null,
    ownerName: "Delivery Lead",
    sponsorUserId: null,
    sponsorName: "Executive Sponsor",
    status: "PLANNING",
    health: "ON_TRACK",
    targetStartDate: "2026-04-06",
    targetFinishDate: null,
    budgetAmount: 0,
    currencyCode: "EUR",
    levelingStrategy: "PRIORITY_THEN_SLACK",
    levelingMaxDelayDays: 30,
    archivedAt: null,
    archivedBy: null,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-04-15T09:00:00.000Z",
    ...base,
  };
}

export function taskFactory(projectId: string) {
  return function createTask(
    base: Partial<Task> &
      Pick<Task, "id" | "name" | "sortOrder" | "type" | "durationDays">,
  ): Task {
    return {
      projectId,
      parentId: null,
      description: "",
      notes: "",
      status: "NOT_STARTED",
      priority: "MEDIUM",
      progressPercent: 0,
      schedulingMode: "AUTO",
      workFormula: "FIXED_DURATION",
      effortHours: base.durationDays * 8,
      calendarMode: "PROJECT",
      calendarWorkingDays: [],
      calendarHoursPerDay: null,
      calendarExceptions: [],
      constraintType: "ASAP",
      constraintDate: null,
      deadlineDate: null,
      levelingDelayDays: 0,
      levelingPriority: 500,
      manualStartDate: null,
      manualFinishDate: null,
      actualStartDate: null,
      actualFinishDate: null,
      actualWorkHours: 0,
      remainingWorkHours: base.durationDays * 8,
      ...base,
    };
  };
}

export function dependencyFactory(projectId: string) {
  return function createDependency(
    id: string,
    predecessorTaskId: string,
    successorTaskId: string,
    type: Dependency["type"],
    lagDays = 0,
    label?: string,
  ): Dependency {
    return {
      id,
      projectId,
      predecessorTaskId,
      predecessorProjectId: projectId,
      successorProjectId: projectId,
      successorTaskId,
      type,
      lagDays,
      label,
      createdAt: "2026-03-20T10:00:00.000Z",
    };
  };
}

export function resourceFactory(projectId: string) {
  return function createResource(
    base: Partial<Resource> &
      Pick<Resource, "id" | "name" | "role" | "color">,
  ): Resource {
    return {
      projectId,
      type: "PERSON",
      location: "Paris",
      availabilityPct: 100,
      capacityHoursPerDay: 8,
      calendarWorkingDays: [],
      calendarHoursPerDay: null,
      calendarExceptions: [],
      costRate: null,
      ...base,
    };
  };
}

export function assignmentFactory(projectId: string) {
  return function createAssignment(
    id: string,
    taskId: string,
    resourceId: string,
    allocationPct: number,
    notes?: string,
  ): Assignment {
    return {
      id,
      projectId,
      taskId,
      resourceId,
      allocationPct,
      notes,
    };
  };
}

export function snapshotFactory() {
  return function createSnapshot(
    baselineId: string,
    taskId: string,
    name: string,
    startDate: string | null,
    finishDate: string | null,
    durationDays: number,
    progressPercent: number,
    isCritical: boolean,
    workHours = durationDays * 8,
    plannedCost = 0,
  ): BaselineTaskSnapshot {
    return {
      id: `${baselineId}-${taskId}`,
      baselineId,
      taskId,
      name,
      startDate,
      finishDate,
      durationDays,
      workHours,
      plannedCost,
      progressPercent,
      isCritical,
    };
  };
}

export function createBaseline(
  projectId: string,
  base: Omit<Baseline, "projectId">,
): Baseline {
  return {
    projectId,
    ...base,
  };
}
