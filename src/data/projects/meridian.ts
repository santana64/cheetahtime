import type { Assignment, Baseline, Dependency, ProjectAggregate, Resource, Task } from "@/types/planning";

import {
  assignmentFactory,
  createBaseline,
  createCalendar,
  createProject,
  dependencyFactory,
  resourceFactory,
  snapshotFactory,
  taskFactory,
} from "@/data/projects/factories";

export function createMeridianProject(): ProjectAggregate {
  const projectId = "meridian-dc-transition";
  const task = taskFactory(projectId);
  const dependency = dependencyFactory(projectId);
  const resource = resourceFactory(projectId);
  const assignment = assignmentFactory(projectId);
  const snapshot = snapshotFactory();
  const baselineId = `${projectId}-baseline-ops`;

  const project = createProject({
    id: projectId,
    slug: projectId,
    code: "MRD-0510",
    name: "Meridian Data Center Transition",
    clientName: "Meridian Health Systems",
    description:
      "Physical and logical migration of production services into the Lyon resiliency zone with staged waves and CAB control points.",
    portfolio: "Infrastructure Reliability",
    ownerName: "Iris Laurent",
    sponsorName: "David Steiner",
    status: "ACTIVE",
    health: "WATCH",
    targetStartDate: "2026-05-04",
    targetFinishDate: "2026-06-12",
    budgetAmount: 780000,
    updatedAt: "2026-04-15T07:45:00.000Z",
  });

  const tasks: Task[] = [
    task({ id: "md-1", name: "Mobilize", sortOrder: 10, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "md-1-1",
      parentId: "md-1",
      name: "Kickoff complete",
      sortOrder: 11,
      type: "MILESTONE",
      durationDays: 0,
      status: "DONE",
      progressPercent: 100,
      priority: "HIGH",
      constraintType: "START_NO_EARLIER_THAN",
      constraintDate: "2026-05-04",
    }),
    task({
      id: "md-1-2",
      parentId: "md-1",
      name: "Rack and asset audit",
      sortOrder: 12,
      type: "TASK",
      durationDays: 4,
      status: "IN_PROGRESS",
      progressPercent: 50,
      priority: "HIGH",
      constraintType: "START_NO_EARLIER_THAN",
      constraintDate: "2026-05-04",
      description: "Confirm rack inventory, asset tagging, and move sequencing.",
    }),
    task({
      id: "md-1-3",
      parentId: "md-1",
      name: "Migration wave plan",
      sortOrder: 13,
      type: "TASK",
      durationDays: 3,
      priority: "HIGH",
      description: "Define cut groups, freeze windows, and rollback points.",
    }),
    task({ id: "md-2", name: "Prepare", sortOrder: 20, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "md-2-1",
      parentId: "md-2",
      name: "Network fabric build",
      sortOrder: 21,
      type: "TASK",
      durationDays: 6,
      priority: "URGENT",
      description: "Stand up the target network segments and cross-site routing.",
    }),
    task({
      id: "md-2-2",
      parentId: "md-2",
      name: "Backup validation",
      sortOrder: 22,
      type: "TASK",
      durationDays: 4,
      priority: "HIGH",
      description: "Restore tests for critical workloads and shared services.",
    }),
    task({
      id: "md-2-3",
      parentId: "md-2",
      name: "CAB approval",
      sortOrder: 23,
      type: "MILESTONE",
      durationDays: 0,
      priority: "URGENT",
      description: "Formal change approval for production execution.",
    }),
    task({ id: "md-3", name: "Execute", sortOrder: 30, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "md-3-1",
      parentId: "md-3",
      name: "Wave 1 migration",
      sortOrder: 31,
      type: "TASK",
      durationDays: 3,
      priority: "URGENT",
    }),
    task({
      id: "md-3-2",
      parentId: "md-3",
      name: "Wave 2 migration",
      sortOrder: 32,
      type: "TASK",
      durationDays: 3,
      priority: "URGENT",
    }),
    task({
      id: "md-3-3",
      parentId: "md-3",
      name: "Service validation",
      sortOrder: 33,
      type: "TASK",
      durationDays: 4,
      priority: "HIGH",
    }),
    task({ id: "md-4", name: "Close", sortOrder: 40, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "md-4-1",
      parentId: "md-4",
      name: "Operational handover",
      sortOrder: 41,
      type: "TASK",
      durationDays: 2,
    }),
    task({
      id: "md-4-2",
      parentId: "md-4",
      name: "Closure sign-off",
      sortOrder: 42,
      type: "MILESTONE",
      durationDays: 0,
    }),
  ];

  const dependencies: Dependency[] = [
    dependency("md-d1", "md-1-1", "md-1-2", "FS"),
    dependency("md-d2", "md-1-2", "md-1-3", "FS"),
    dependency("md-d3", "md-1-3", "md-2-1", "FS"),
    dependency("md-d4", "md-1-2", "md-2-2", "SS", 1),
    dependency("md-d5", "md-2-1", "md-2-3", "FF"),
    dependency("md-d6", "md-2-2", "md-2-3", "FF"),
    dependency("md-d7", "md-2-3", "md-3-1", "FS"),
    dependency("md-d8", "md-3-1", "md-3-2", "FS", 1),
    dependency("md-d9", "md-3-2", "md-3-3", "FS"),
    dependency("md-d10", "md-3-3", "md-4-1", "FS"),
    dependency("md-d11", "md-4-1", "md-4-2", "FS"),
  ];

  const resources: Resource[] = [
    resource({ id: "md-r1", name: "Iris Laurent", role: "Transition Manager", color: "#0f766e" }),
    resource({ id: "md-r2", name: "Quentin Faure", role: "Infrastructure Lead", color: "#1d4ed8" }),
    resource({ id: "md-r3", name: "Maya Singh", role: "Network Lead", color: "#9333ea" }),
    resource({ id: "md-r4", name: "Romain Petit", role: "Backup Engineer", color: "#b45309" }),
    resource({ id: "md-r5", name: "Clara Costa", role: "Validation Lead", color: "#dc2626" }),
  ];

  const assignments: Assignment[] = [
    assignment("md-a1", "md-1-1", "md-r1", 70),
    assignment("md-a2", "md-1-2", "md-r2", 70),
    assignment("md-a3", "md-1-2", "md-r1", 30),
    assignment("md-a4", "md-1-3", "md-r1", 60),
    assignment("md-a5", "md-2-1", "md-r3", 90),
    assignment("md-a6", "md-2-2", "md-r4", 80),
    assignment("md-a7", "md-2-3", "md-r1", 40),
    assignment("md-a8", "md-3-1", "md-r2", 60),
    assignment("md-a9", "md-3-1", "md-r3", 40),
    assignment("md-a10", "md-3-2", "md-r2", 70),
    assignment("md-a11", "md-3-3", "md-r5", 100),
    assignment("md-a12", "md-4-1", "md-r1", 30),
    assignment("md-a13", "md-4-2", "md-r1", 20),
  ];

  const baselines: Baseline[] = [
    createBaseline(projectId, {
      id: baselineId,
      name: "Operations Baseline",
      description: "Approved delivery baseline before procurement lock.",
      capturedAt: "2026-04-11T15:00:00.000Z",
      capturedBy: "Iris Laurent",
      isActive: true,
      snapshots: [
        snapshot(baselineId, "md-1-1", "Kickoff complete", "2026-05-04", "2026-05-04", 0, 100, false),
        snapshot(baselineId, "md-1-2", "Rack and asset audit", "2026-05-04", "2026-05-07", 4, 40, false),
        snapshot(baselineId, "md-1-3", "Migration wave plan", "2026-05-08", "2026-05-12", 3, 0, false),
        snapshot(baselineId, "md-2-1", "Network fabric build", "2026-05-13", "2026-05-20", 6, 0, true),
        snapshot(baselineId, "md-2-2", "Backup validation", "2026-05-14", "2026-05-19", 4, 0, false),
        snapshot(baselineId, "md-2-3", "CAB approval", "2026-05-20", "2026-05-20", 0, 0, true),
        snapshot(baselineId, "md-3-1", "Wave 1 migration", "2026-05-21", "2026-05-25", 3, 0, true),
        snapshot(baselineId, "md-3-2", "Wave 2 migration", "2026-05-27", "2026-05-29", 3, 0, true),
        snapshot(baselineId, "md-3-3", "Service validation", "2026-06-01", "2026-06-04", 4, 0, true),
        snapshot(baselineId, "md-4-1", "Operational handover", "2026-06-05", "2026-06-08", 2, 0, false),
        snapshot(baselineId, "md-4-2", "Closure sign-off", "2026-06-08", "2026-06-08", 0, 0, false),
      ],
    }),
  ];

  return {
    project,
    calendar: createCalendar(projectId, "Europe/Paris"),
    tasks,
    dependencies,
    resources,
    assignments,
    baselines,
    timesheetEntries: [],
    actualCostEntries: [],
  };
}
