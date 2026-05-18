import type { Assignment, Dependency, ProjectAggregate, Resource, Task } from "@/types/planning";

import {
  assignmentFactory,
  createCalendar,
  createProject,
  dependencyFactory,
  resourceFactory,
  taskFactory,
} from "@/data/projects/factories";

export function createAtlasProject(): ProjectAggregate {
  const projectId = "atlas-productization-program";
  const task = taskFactory(projectId);
  const dependency = dependencyFactory(projectId);
  const resource = resourceFactory(projectId);
  const assignment = assignmentFactory(projectId);

  const project = createProject({
    id: projectId,
    slug: projectId,
    code: "ATL-0601",
    name: "Atlas Productization Program",
    clientName: "Atlas Services Group",
    description:
      "Portfolio-wide operating model redesign to package internal capabilities into a repeatable external services offer.",
    portfolio: "Commercial Growth",
    ownerName: "Camille Duret",
    sponsorName: "Victor Hall",
    status: "PLANNING",
    health: "ON_TRACK",
    targetStartDate: "2026-06-01",
    targetFinishDate: "2026-07-03",
    budgetAmount: 420000,
    updatedAt: "2026-04-15T08:10:00.000Z",
  });

  const tasks: Task[] = [
    task({ id: "at-1", name: "Frame the Opportunity", sortOrder: 10, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "at-1-1",
      parentId: "at-1",
      name: "Kickoff complete",
      sortOrder: 11,
      type: "MILESTONE",
      durationDays: 0,
      constraintType: "START_NO_EARLIER_THAN",
      constraintDate: "2026-06-01",
      priority: "HIGH",
    }),
    task({
      id: "at-1-2",
      parentId: "at-1",
      name: "Value stream map",
      sortOrder: 12,
      type: "TASK",
      durationDays: 4,
      priority: "HIGH",
      description: "Map candidate offers, delivery anchors, and cross-team dependencies.",
    }),
    task({
      id: "at-1-3",
      parentId: "at-1",
      name: "Decision memo approved",
      sortOrder: 13,
      type: "MILESTONE",
      durationDays: 0,
      priority: "HIGH",
    }),
    task({ id: "at-2", name: "Design the Delivery Model", sortOrder: 20, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "at-2-1",
      parentId: "at-2",
      name: "Service packaging",
      sortOrder: 21,
      type: "TASK",
      durationDays: 5,
      priority: "HIGH",
    }),
    task({
      id: "at-2-2",
      parentId: "at-2",
      name: "Pricing design",
      sortOrder: 22,
      type: "TASK",
      durationDays: 4,
    }),
    task({
      id: "at-2-3",
      parentId: "at-2",
      name: "Operations readiness",
      sortOrder: 23,
      type: "TASK",
      durationDays: 4,
    }),
    task({ id: "at-3", name: "Pilot Launch", sortOrder: 30, type: "SUMMARY", durationDays: 0 }),
    task({
      id: "at-3-1",
      parentId: "at-3",
      name: "Pilot enablement",
      sortOrder: 31,
      type: "TASK",
      durationDays: 5,
      priority: "HIGH",
    }),
    task({
      id: "at-3-2",
      parentId: "at-3",
      name: "Launch readout",
      sortOrder: 32,
      type: "MILESTONE",
      durationDays: 0,
    }),
  ];

  const dependencies: Dependency[] = [
    dependency("at-d1", "at-1-1", "at-1-2", "FS"),
    dependency("at-d2", "at-1-2", "at-1-3", "FS"),
    dependency("at-d3", "at-1-3", "at-2-1", "FS"),
    dependency("at-d4", "at-2-1", "at-2-2", "SS", 1),
    dependency("at-d5", "at-2-1", "at-2-3", "FS"),
    dependency("at-d6", "at-2-3", "at-3-1", "FF"),
    dependency("at-d7", "at-2-2", "at-3-1", "FS"),
    dependency("at-d8", "at-3-1", "at-3-2", "FS"),
  ];

  const resources: Resource[] = [
    resource({ id: "at-r1", name: "Camille Duret", role: "Program Lead", color: "#0f766e" }),
    resource({ id: "at-r2", name: "Eva Becker", role: "Commercial Strategist", color: "#1d4ed8" }),
    resource({ id: "at-r3", name: "Matteo Ricci", role: "Operations Designer", color: "#9333ea" }),
    resource({ id: "at-r4", name: "Helena Zhou", role: "Pricing Analyst", color: "#b45309" }),
  ];

  const assignments: Assignment[] = [
    assignment("at-a1", "at-1-1", "at-r1", 40),
    assignment("at-a2", "at-1-2", "at-r2", 50),
    assignment("at-a3", "at-1-2", "at-r1", 25),
    assignment("at-a4", "at-2-1", "at-r2", 60),
    assignment("at-a5", "at-2-2", "at-r4", 60),
    assignment("at-a6", "at-2-3", "at-r3", 80),
    assignment("at-a7", "at-3-1", "at-r1", 30),
    assignment("at-a8", "at-3-1", "at-r3", 50),
  ];

  return {
    project,
    calendar: createCalendar(projectId, "Europe/Paris"),
    tasks,
    dependencies,
    resources,
    assignments,
    baselines: [],
    timesheetEntries: [],
    actualCostEntries: [],
  };
}
