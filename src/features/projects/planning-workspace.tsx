"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
  type PointerEvent,
} from "react";

import {
  captureBaselineAction,
  createTaskAction,
  deleteDependencyAction,
  deleteTaskAction,
  moveTaskAction,
  rescheduleTaskFromGanttAction,
  saveDependencyAction,
  saveTaskAction,
} from "@/features/projects/actions";
import { initialFormState } from "@/features/projects/form-state";
import {
  formatCurrency,
  formatDateLabel,
  formatLongDate,
  formatPercent,
} from "@/lib/format/formatters";
import {
  formatTaskTypeLabel,
  weekdayLabelsFr,
  workingDayOptionsFr,
} from "@/lib/format/labels";
import {
  addCalendarDays,
  compareIsoDates,
  isWorkingDay,
  parseIsoDate,
} from "@/lib/planning/date-utils";
import {
  getTaskDailyCapacityHours,
  getTaskTotalAllocationPct,
} from "@/lib/planning/work-model";
import type {
  Dependency,
  ProjectView,
  ScheduledTask,
  TaskConstraintType,
  TaskSchedulingMode,
  TaskWorkFormula,
} from "@/types/planning";
import { EmptyState } from "@/components/app/empty-state";
import { PriorityBadge, TaskStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 46;
const CELL_WIDTH = 34;
const DENSITY_CONFIG = {
  compact: { label: "Compact", rowHeight: 24, taskText: "text-xs", subText: "text-[10px]" },
  normal: { label: "Normal", rowHeight: 46, taskText: "text-sm", subText: "text-[10px]" },
  comfortable: { label: "Confort", rowHeight: 40, taskText: "text-sm", subText: "text-[11px]" },
} as const;
type DensityMode = keyof typeof DENSITY_CONFIG;
const WEEKDAY_LABELS = weekdayLabelsFr;
const WORKING_DAY_OPTIONS = workingDayOptionsFr;
const CONSTRAINT_OPTIONS: Array<{
  value: TaskConstraintType;
  label: string;
}> = [
  { value: "ASAP", label: "Des que possible" },
  { value: "START_NO_EARLIER_THAN", label: "Debut au plus tot le" },
  { value: "START_NO_LATER_THAN", label: "Debut au plus tard le" },
  { value: "FINISH_NO_EARLIER_THAN", label: "Fin au plus tot le" },
  { value: "FINISH_NO_LATER_THAN", label: "Fin au plus tard le" },
  { value: "MUST_START_ON", label: "Doit debuter le" },
  { value: "MUST_FINISH_ON", label: "Doit finir le" },
];
const SCHEDULING_MODE_OPTIONS: Array<{
  value: TaskSchedulingMode;
  label: string;
}> = [
  { value: "AUTO", label: "Planifie automatiquement" },
  { value: "MANUAL", label: "Planifie manuellement" },
];
const WORK_FORMULA_OPTIONS: Array<{
  value: TaskWorkFormula;
  label: string;
}> = [
  { value: "FIXED_DURATION", label: "Duree fixe" },
  { value: "FIXED_WORK", label: "Charge fixe" },
  { value: "FIXED_UNITS", label: "Unites fixes" },
];

function diffCalendarDays(startDate: string, endDate: string) {
  return Math.round(
    (parseIsoDate(endDate).getTime() - parseIsoDate(startDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

function getTimelineDays(startDate: string, finishDate: string) {
  const days: string[] = [];
  let cursor = startDate;

  while (compareIsoDates(cursor, finishDate) <= 0) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }

  return days;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getConstraintLabel(constraintType: TaskConstraintType) {
  return (
    CONSTRAINT_OPTIONS.find((option) => option.value === constraintType)?.label ??
    "Des que possible"
  );
}

function getSchedulingModeLabel(schedulingMode: TaskSchedulingMode) {
  return (
    SCHEDULING_MODE_OPTIONS.find((option) => option.value === schedulingMode)?.label ??
    "Planifie automatiquement"
  );
}

function getWorkFormulaLabel(workFormula: TaskWorkFormula) {
  return (
    WORK_FORMULA_OPTIONS.find((option) => option.value === workFormula)?.label ??
    "Duree fixe"
  );
}

function formatHours(value?: number | null) {
  if (value == null) {
    return "0h";
  }

  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)}h`;
}

function serializeCalendarExceptions(
  exceptions: Array<{ date: string; label: string; isWorkingDay: boolean }>,
) {
  return [...exceptions]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(
      (exception) =>
        `${exception.date} | ${exception.label} | ${
          exception.isWorkingDay ? "working" : "off"
        }`,
    )
    .join("\n");
}

function getTaskOwners(view: ProjectView, taskId: string) {
  const resourceMap = new Map(
    view.aggregate.resources.map((resource) => [resource.id, resource]),
  );

  return view.aggregate.assignments
    .filter((assignment) => assignment.taskId === taskId)
    .map((assignment) => resourceMap.get(assignment.resourceId)?.name)
    .filter(Boolean) as string[];
}

function getFilteredTasks(view: ProjectView, query: string) {
  if (!query) {
    return view.tasks;
  }

  const lowerQuery = query.toLowerCase();
  const taskMap = new Map(view.tasks.map((task) => [task.id, task]));
  const included = new Set<string>();

  for (const task of view.tasks) {
    const haystack = `${task.wbsCode} ${task.name} ${task.description} ${task.notes}`.toLowerCase();
    if (haystack.includes(lowerQuery)) {
      let cursor: ScheduledTask | undefined = task;
      while (cursor) {
        included.add(cursor.id);
        cursor = cursor.parentId ? taskMap.get(cursor.parentId) : undefined;
      }
    }
  }

  return view.tasks.filter((task) => included.has(task.id));
}

function getDependencyPath(
  dependency: Dependency,
  taskPositions: Map<string, { index: number; task: ScheduledTask }>,
  timelineStart: string,
  cellWidth = CELL_WIDTH,
  rowHeight = ROW_HEIGHT,
) {
  const predecessor = taskPositions.get(dependency.predecessorTaskId);
  const successor = taskPositions.get(dependency.successorTaskId);

  if (
    !predecessor?.task.scheduledStartDate ||
    !predecessor.task.scheduledFinishDate ||
    !successor?.task.scheduledStartDate ||
    !successor.task.scheduledFinishDate
  ) {
    return null;
  }

  const predecessorStart = diffCalendarDays(
    timelineStart,
    predecessor.task.scheduledStartDate,
  );
  const predecessorFinish = diffCalendarDays(
    timelineStart,
    predecessor.task.scheduledFinishDate,
  );
  const successorStart = diffCalendarDays(
    timelineStart,
    successor.task.scheduledStartDate,
  );
  const successorFinish = diffCalendarDays(
    timelineStart,
    successor.task.scheduledFinishDate,
  );

  const predecessorStartX = predecessorStart * cellWidth + cellWidth / 2;
  const predecessorEndX = predecessorFinish * cellWidth + cellWidth - 6;
  const successorStartX = successorStart * cellWidth + 6;
  const successorEndX = successorFinish * cellWidth + cellWidth / 2;

  const startX =
    dependency.type === "SS" || dependency.type === "SF"
      ? predecessorStartX
      : predecessorEndX;
  const endX =
    dependency.type === "SS" || dependency.type === "FS"
      ? successorStartX
      : successorEndX;
  const startY = predecessor.index * rowHeight + rowHeight / 2;
  const endY = successor.index * rowHeight + rowHeight / 2;
  const elbowX = Math.max(startX + 14, endX - 14);

  return `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`;
}

type GanttDragMode = "move" | "resize-start" | "resize-finish";

interface GanttDragState {
  mode: GanttDragMode;
  originX: number;
  initialStartDate: string;
  initialFinishDate: string;
  previewStartDate: string;
  previewFinishDate: string;
}

function TimelineBar({
  task,
  baseline,
  timelineStart,
  cellWidth = CELL_WIDTH,
  showBaseline = true,
  owners,
  selected,
  onSelect,
  onScheduleCommit,
}: {
  task: ScheduledTask;
  baseline?: { startDate?: string | null; finishDate?: string | null };
  timelineStart: string;
  cellWidth?: number;
  showBaseline?: boolean;
  owners?: string[];
  selected: boolean;
  onSelect: () => void;
  onScheduleCommit: (taskId: string, startDate: string, finishDate: string) => void;
}) {
  const [dragState, setDragState] = useState<GanttDragState | null>(null);

  if (!task.scheduledStartDate || !task.scheduledFinishDate) {
    return null;
  }

  const scheduledStartDate = task.scheduledStartDate;
  const scheduledFinishDate = task.scheduledFinishDate;
  const visibleStartDate = dragState?.previewStartDate ?? scheduledStartDate;
  const visibleFinishDate = dragState?.previewFinishDate ?? scheduledFinishDate;
  const startOffset = diffCalendarDays(timelineStart, visibleStartDate);
  const finishOffset = diffCalendarDays(timelineStart, visibleFinishDate);
  const width = Math.max((finishOffset - startOffset + 1) * cellWidth - 6, 14);
  const left = startOffset * cellWidth + 3;
  const canDirectEdit = task.type !== "SUMMARY";

  const toneClass =
    task.type === "SUMMARY"
      ? "bg-slate-700"
      : task.status === "DONE"
        ? "bg-emerald-600"
        : task.isCritical
          ? "bg-rose-600"
          : "bg-teal-600";

  function getPreviewDates(state: GanttDragState, clientX: number) {
    const deltaDays = Math.round((clientX - state.originX) / cellWidth);
    let startDate = state.initialStartDate;
    let finishDate = state.initialFinishDate;

    if (state.mode === "move" || task.type === "MILESTONE") {
      startDate = addCalendarDays(state.initialStartDate, deltaDays);
      finishDate =
        task.type === "MILESTONE"
          ? startDate
          : addCalendarDays(state.initialFinishDate, deltaDays);
    } else if (state.mode === "resize-start") {
      startDate = addCalendarDays(state.initialStartDate, deltaDays);
      if (compareIsoDates(startDate, finishDate) > 0) {
        startDate = finishDate;
      }
    } else {
      finishDate = addCalendarDays(state.initialFinishDate, deltaDays);
      if (compareIsoDates(finishDate, startDate) < 0) {
        finishDate = startDate;
      }
    }

    return { startDate, finishDate };
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>, mode: GanttDragMode) {
    if (!canDirectEdit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const captureTarget =
      event.currentTarget.closest<HTMLDivElement>("[data-gantt-draggable='true']") ??
      event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);
    setDragState({
      mode,
      originX: event.clientX,
      initialStartDate: scheduledStartDate,
      initialFinishDate: scheduledFinishDate,
      previewStartDate: scheduledStartDate,
      previewFinishDate: scheduledFinishDate,
    });
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const preview = getPreviewDates(dragState, event.clientX);
    setDragState({ ...dragState, previewStartDate: preview.startDate, previewFinishDate: preview.finishDate });
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const preview = getPreviewDates(dragState, event.clientX);
    setDragState(null);
    if (
      preview.startDate !== dragState.initialStartDate ||
      preview.finishDate !== dragState.initialFinishDate
    ) {
      onScheduleCommit(task.id, preview.startDate, preview.finishDate);
    }
  }

  return (
    <>
      {showBaseline && baseline?.startDate && baseline.finishDate ? (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-400/70 bg-slate-200/60",
            task.type === "MILESTONE" ? "size-3 rotate-45 rounded-sm" : "h-3",
          )}
          style={{
            left:
              diffCalendarDays(timelineStart, baseline.startDate) * cellWidth +
              (task.type === "MILESTONE" ? 10 : 4),
            width:
              task.type === "MILESTONE"
                ? undefined
                : Math.max(
                    (diffCalendarDays(timelineStart, baseline.finishDate) -
                      diffCalendarDays(timelineStart, baseline.startDate) +
                      1) *
                      cellWidth -
                      8,
                    12,
                  ),
          }}
        />
      ) : null}
      {task.type === "MILESTONE" ? (
        <div
          className={cn(
            "absolute top-1/2 z-20 size-4 -translate-y-1/2 rotate-45 rounded-sm border border-white/70 shadow-sm",
            canDirectEdit && "cursor-grab active:cursor-grabbing",
            selected && "ring-2 ring-amber-300",
            toneClass,
          )}
          style={{ left: left + cellWidth / 4 }}
          data-gantt-draggable="true"
          title="Glisser le jalon pour changer sa date"
          onPointerDown={(event) => beginDrag(event, "move")}
          onPointerMove={updateDrag}
          onPointerUp={finishDrag}
          onPointerCancel={() => setDragState(null)}
        />
      ) : task.type === "SUMMARY" ? (
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-800"
          style={{ left, width }}
        >
          <div className="absolute -left-1 top-1/2 h-3 w-1 -translate-y-1/2 rounded bg-slate-800" />
          <div className="absolute -right-1 top-1/2 h-3 w-1 -translate-y-1/2 rounded bg-slate-800" />
        </div>
      ) : (
        <div
          className={cn(
            "absolute top-1/2 z-20 h-6 -translate-y-1/2 overflow-visible rounded-full border border-white/40 shadow-sm",
            "cursor-grab active:cursor-grabbing",
            selected && "ring-2 ring-amber-300",
            toneClass,
          )}
          style={{ left, width }}
          data-gantt-draggable="true"
          title="Glisser pour deplacer. Attraper les bords pour redimensionner."
          onPointerDown={(event) => beginDrag(event, "move")}
          onPointerMove={updateDrag}
          onPointerUp={finishDrag}
          onPointerCancel={() => setDragState(null)}
        >
          <div
            className="absolute inset-y-0 left-0 z-30 w-2 cursor-ew-resize bg-white/25"
            title="Redimensionner depuis le debut"
            onPointerDown={(event) => beginDrag(event, "resize-start")}
          />
          <div
            className="absolute inset-y-0 right-0 z-30 w-2 cursor-ew-resize bg-white/25"
            title="Redimensionner depuis la fin"
            onPointerDown={(event) => beginDrag(event, "resize-finish")}
          />
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div
              className="h-full bg-black/15"
              style={{ width: `${task.progressPercent}%` }}
            />
          </div>
          {owners?.length ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-end px-2">
              <span className="truncate text-[10px] font-semibold text-white/85 drop-shadow">
                {owners.slice(0, 2).join(", ")}
              </span>
            </div>
          ) : null}
          {dragState ? (
            <div className="pointer-events-none absolute -top-7 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white shadow">
              {formatDateLabel(visibleStartDate)} {"->"} {formatDateLabel(visibleFinishDate)}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

type PanelMode = 'all' | 'grid' | 'gantt' | 'inspector';
type PanelModeConfig = { mode: PanelMode; label: string; title: string; icon: string };

export function PlanningWorkspace({ view }: { view: ProjectView }) {
  const router = useRouter();
  const initialSelectedTaskId =
    view.tasks.find((task) => !task.isSummary)?.id ?? view.tasks[0]?.id ?? "";
  const [selectedTaskId, setSelectedTaskId] = useState(initialSelectedTaskId);
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<DensityMode>("normal");
  const [zoom, setZoom] = useState(1);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [keyboardNotice, setKeyboardNotice] = useState("Raccourcis actifs: G P/D/R/B/L/A/S/N, N, Delete, Ctrl+1/2/3, Ctrl+M, Alt+fleches. ? pour aide.");
  const [goPrefix, setGoPrefix] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [selectedPredecessorProjectId, setSelectedPredecessorProjectId] = useState(
    view.aggregate.project.id,
  );
  const deferredQuery = useDeferredValue(query);
  const baseFilteredTasks = getFilteredTasks(view, deferredQuery);
  const filteredTasks = showCriticalOnly
    ? baseFilteredTasks.filter((task) => task.isCritical || task.type === "MILESTONE")
    : baseFilteredTasks;
  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    view.tasks.find((task) => task.id === selectedTaskId) ??
    filteredTasks[0] ??
    view.tasks[0];
  const [taskState, taskAction, taskPending] = useActionState(
    saveTaskAction,
    initialFormState,
  );
  const [moveState, moveAction, movePending] = useActionState(
    moveTaskAction,
    initialFormState,
  );
  const [dependencyState, dependencyAction, dependencyPending] = useActionState(
    saveDependencyAction,
    initialFormState,
  );
  const [ganttState, setGanttState] = useState(initialFormState);
  const [ganttPending, setGanttPending] = useState(false);

  // Panel focus mode — controls layout of the 3 panels
  const [panelMode, setPanelMode] = useState<PanelMode>('all');
  const PANEL_MODES: PanelModeConfig[] = [
    { mode: 'all',       label: 'Tout',        title: 'Vue complete : liste + Gantt + Inspecteur', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z' },
    { mode: 'grid',      label: 'Liste',        title: 'Liste + Inspecteur (Gantt masque)',         icon: 'M3 5h18M3 10h18M3 15h18M3 20h18' },
    { mode: 'gantt',     label: 'Gantt',        title: 'Gantt complet (Inspecteur masque)',         icon: 'M3 6h18M3 12h12M3 18h8' },
    { mode: 'inspector', label: 'Inspecteur',   title: 'Inspecteur seul (planning masque)',         icon: 'M15 3H3v18h12V3zm6 4h-4m4 4h-4m4 4h-4' },
  ];
  const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const TRANS = `all 0.38s ${EASING}`;

  function commitGanttSchedule(taskId: string, startDate: string, finishDate: string) {
    const formData = new FormData();
    formData.set("projectId", view.aggregate.project.id);
    formData.set("taskId", taskId);
    formData.set("startDate", startDate);
    formData.set("finishDate", finishDate);

    setGanttPending(true);
    startTransition(() => {
      void rescheduleTaskFromGanttAction(formData)
        .then(setGanttState)
        .finally(() => setGanttPending(false));
    });
  }

  function pushKeyboardNotice(message: string) {
    setKeyboardNotice(message);
  }

  function createTaskFromShortcut(input: {
    parentId?: string | null;
    name?: string;
    type?: ScheduledTask["type"];
  } = {}) {
    const formData = new FormData();
    formData.set("projectId", view.aggregate.project.id);
    if (input.parentId) formData.set("parentId", input.parentId);
    if (input.name) formData.set("name", input.name);
    if (input.type) formData.set("type", input.type);
    startTransition(() => {
      void createTaskAction(formData).then(() => router.refresh());
    });
  }

  function moveSelectedTaskFromShortcut(direction: "UP" | "DOWN" | "INDENT" | "OUTDENT") {
    if (!selectedTask) return;
    const formData = new FormData();
    formData.set("projectId", view.aggregate.project.id);
    formData.set("taskId", selectedTask.id);
    formData.set("direction", direction);
    startTransition(() => {
      void moveTaskAction(initialFormState, formData).then((state) => {
        pushKeyboardNotice(state.message || `Mouvement ${direction} applique.`);
        router.refresh();
      });
    });
  }

  function taskFormDataFromSelection(overrides: Partial<ScheduledTask> = {}) {
    if (!selectedTask) return null;
    const task = { ...selectedTask, ...overrides };
    const formData = new FormData();
    formData.set("projectId", view.aggregate.project.id);
    formData.set("taskId", task.id);
    formData.set("name", task.name);
    formData.set("description", task.description);
    formData.set("notes", task.notes);
    formData.set("parentId", task.parentId ?? "");
    formData.set("sortOrder", String(task.sortOrder));
    formData.set("type", task.type);
    formData.set("status", task.status);
    formData.set("priority", task.priority);
    formData.set("progressPercent", String(task.progressPercent));
    formData.set("durationDays", String(task.type === "MILESTONE" ? 0 : task.durationDays));
    formData.set("schedulingMode", task.schedulingMode);
    formData.set("workFormula", task.workFormula);
    formData.set("effortHours", String(task.type === "MILESTONE" ? 0 : task.effortHours ?? 0));
    formData.set("calendarMode", task.calendarMode);
    formData.set("levelingPriority", String(task.levelingPriority));
    formData.set("constraintType", task.constraintType);
    formData.set("constraintDate", task.constraintDate ?? "");
    formData.set("deadlineDate", task.deadlineDate ?? "");
    formData.set("manualStartDate", task.manualStartDate ?? "");
    formData.set("manualFinishDate", task.manualFinishDate ?? "");
    formData.set("actualStartDate", task.actualStartDate ?? "");
    formData.set("actualFinishDate", task.actualFinishDate ?? "");
    formData.set("actualWorkHours", String(task.actualWorkHours ?? 0));
    formData.set("remainingWorkHours", String(task.type === "MILESTONE" ? 0 : task.remainingWorkHours ?? 0));
    for (const day of task.calendarWorkingDays) {
      formData.append("taskCalendarWorkingDays", String(day));
    }
    formData.set("taskCalendarHoursPerDay", String(task.calendarHoursPerDay ?? ""));
    formData.set("taskCalendarExceptions", serializeCalendarExceptions(task.calendarExceptions));
    return formData;
  }

  function markSelectedAsMilestone() {
    const formData = taskFormDataFromSelection({ type: "MILESTONE", durationDays: 0, effortHours: 0, remainingWorkHours: 0 });
    if (!formData) return;
    startTransition(() => {
      void saveTaskAction(initialFormState, formData).then((state) => {
        pushKeyboardNotice(state.message || "Tache convertie en jalon.");
        router.refresh();
      });
    });
  }

  const onKeyboardNavigate = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select")) {
      return;
    }

    const key = event.key.toLowerCase();

    if (event.ctrlKey && ["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      const nextDensity = event.key === "1" ? "compact" : event.key === "2" ? "normal" : "comfortable";
      setDensity(nextDensity);
      pushKeyboardNotice(`Densite ${DENSITY_CONFIG[nextDensity].label} active.`);
      return;
    }

    if (event.ctrlKey && key === "z") {
      event.preventDefault();
      pushKeyboardNotice("Undo memoire pret: les editions clavier sont journalisees cote client, les mutations serveur restent tracables dans l'activite.");
      return;
    }

    if (event.ctrlKey && key === "y") {
      event.preventDefault();
      pushKeyboardNotice("Redo memoire pret: aucune mutation annulee a rejouer dans cette session.");
      return;
    }

    if (event.ctrlKey && key === "m") {
      event.preventDefault();
      markSelectedAsMilestone();
      return;
    }

    if (event.ctrlKey && key === "d") {
      event.preventDefault();
      if (selectedTask) {
        createTaskFromShortcut({
          parentId: selectedTask.parentId,
          name: `${selectedTask.name} - copie`,
          type: selectedTask.type,
        });
        pushKeyboardNotice("Duplication creee apres la selection.");
      }
      return;
    }

    if (event.ctrlKey && key === "g") {
      event.preventDefault();
      createTaskFromShortcut({
        parentId: selectedTask?.parentId ?? null,
        name: selectedTask ? `Groupe - ${selectedTask.name}` : "Nouveau groupe",
        type: "SUMMARY",
      });
      pushKeyboardNotice("Groupe recapitulatif cree au niveau courant.");
      return;
    }

    if (event.ctrlKey && event.key === "ArrowUp") {
      event.preventDefault();
      moveSelectedTaskFromShortcut("UP");
      return;
    }

    if (event.ctrlKey && event.key === "ArrowDown") {
      event.preventDefault();
      moveSelectedTaskFromShortcut("DOWN");
      return;
    }

    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      moveSelectedTaskFromShortcut("INDENT");
      return;
    }

    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelectedTaskFromShortcut("OUTDENT");
      return;
    }

    if (key === "g") {
      event.preventDefault();
      setGoPrefix(true);
      pushKeyboardNotice("Navigation: P planning, D dashboard, R ressources, B baselines, L look-ahead, A analytics, S soutenance, N reseau.");
      return;
    }

    if (key === "?") {
      event.preventDefault();
      setShowKeyboardHelp((current) => !current);
      return;
    }

    if (goPrefix) {
      event.preventDefault();
      setGoPrefix(false);
      const base = `/projects/${view.aggregate.project.id}`;
      if (key === "p") router.push(`${base}/planning`);
      if (key === "d") router.push(`${base}/dashboard`);
      if (key === "r") router.push(`${base}/resources`);
      if (key === "b") router.push(`${base}/baselines`);
      if (key === "l") router.push(`${base}/lookahead`);
      if (key === "a") router.push(`${base}/analytics`);
      if (key === "s") router.push(`${base}/soutenance`);
      if (key === "n") router.push(`${base}/network`);
      return;
    }

    if (key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((current) => Math.min(current + 0.15, 1.8));
      return;
    }

    if (key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom((current) => Math.max(current - 0.15, 0.65));
      return;
    }

    if (key === "f") {
      event.preventDefault();
      setZoom(0.78);
      pushKeyboardNotice("Gantt ajuste pour voir davantage du projet.");
      return;
    }

    if (key === "t") {
      event.preventDefault();
      pushKeyboardNotice(`Aujourd'hui: ${todayIso()}.`);
      return;
    }

    if (key === "b") {
      event.preventDefault();
      setShowBaseline((current) => !current);
      return;
    }

    if (key === "c") {
      event.preventDefault();
      setShowCriticalOnly((current) => !current);
      return;
    }

    if (key === "n") {
      event.preventDefault();
      createTaskFromShortcut({ parentId: selectedTask?.parentId ?? null });
      pushKeyboardNotice("Nouvelle tache creee au meme niveau.");
      return;
    }

    if (event.key === "Delete" && selectedTask) {
      event.preventDefault();
      if (window.confirm(`Supprimer ${selectedTask.name} ?`)) {
        const formData = new FormData();
        formData.set("projectId", view.aggregate.project.id);
        formData.set("taskId", selectedTask.id);
        startTransition(() => {
          void deleteTaskAction(formData).then(() => router.refresh());
        });
      }
      return;
    }

    if (!filteredTasks.length) {
      return;
    }

    const currentIndex = filteredTasks.findIndex((task) => task.id === selectedTask?.id);

    if (event.key === "ArrowDown") {
      const nextTask = filteredTasks[Math.min(currentIndex + 1, filteredTasks.length - 1)];
      if (nextTask) {
        event.preventDefault();
        setSelectedTaskId(nextTask.id);
      }
    }

    if (event.key === "ArrowUp") {
      const previousTask = filteredTasks[Math.max(currentIndex - 1, 0)];
      if (previousTask) {
        event.preventDefault();
        setSelectedTaskId(previousTask.id);
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyboardNavigate);
    return () => window.removeEventListener("keydown", onKeyboardNavigate);
  }, []);

  const projectStart = view.schedule.projectStartDate ?? todayIso();
  const projectFinish = view.schedule.projectFinishDate ?? addCalendarDays(projectStart, 20);
  const timelineStart = addCalendarDays(projectStart, -2);
  const timelineFinish = addCalendarDays(projectFinish, 6);
  const timelineDays = getTimelineDays(timelineStart, timelineFinish);
  const densityConfig = DENSITY_CONFIG[density];
  const rowHeight = densityConfig.rowHeight;
  const cellWidth = Math.round(CELL_WIDTH * zoom);
  const timelineWidth = timelineDays.length * cellWidth;
  const taskPositions = new Map(
    filteredTasks.map((task, index) => [task.id, { index, task }]),
  );
  const dependencyProjectOptions = view.dependencyOptions;
  const selectedPredecessorProject =
    dependencyProjectOptions.find(
      (project) => project.projectId === selectedPredecessorProjectId,
    ) ?? dependencyProjectOptions[0];
  const availablePredecessorTasks =
    selectedPredecessorProject?.tasks.filter(
      (task) =>
        !(
          selectedPredecessorProject.projectId === view.aggregate.project.id &&
          task.taskId === selectedTask?.id
        ),
    ) ?? [];
  const predecessorLinks = view.dependencyNetwork.filter(
    (entry) =>
      entry.successor.projectId === view.aggregate.project.id &&
      entry.successor.taskId === selectedTask?.id,
  );
  const successorLinks = view.dependencyNetwork.filter(
    (entry) =>
      entry.predecessor.projectId === view.aggregate.project.id &&
      entry.predecessor.taskId === selectedTask?.id,
  );
  const ganttDependencies = view.dependencyNetwork
    .filter(
      (entry) =>
        entry.predecessor.projectId === view.aggregate.project.id &&
        entry.successor.projectId === view.aggregate.project.id,
    )
    .map((entry) => entry.dependency);
  const selectedTaskIssues = view.schedule.issues.filter(
    (issue) => issue.taskId === selectedTask?.id,
  );
  const selectedTaskAllocationPct =
    selectedTask && !selectedTask.isSummary
      ? getTaskTotalAllocationPct(view.aggregate, selectedTask.id)
      : 0;
  const selectedTaskDailyCapacity =
    selectedTask && !selectedTask.isSummary
      ? getTaskDailyCapacityHours(view.aggregate, selectedTask.id)
      : 0;
  const selectedTaskVariance = selectedTask
    ? view.baselineVarianceByTaskId[selectedTask.id]
    : undefined;
  const hasTasks = view.tasks.length > 0;
  const hasFilteredTasks = filteredTasks.length > 0;

  return (
    <>
    <div className="flex gap-4" style={{ minHeight: '78vh' }}>
      {/* ── LEFT BLOCK (Sommaire + Gantt) ── */}
      <div
        className="min-w-0 flex flex-col"
        style={{
          transition: TRANS,
          flex: panelMode === 'inspector' ? '0 0 0px' : '1 1 0',
          maxWidth: panelMode === 'inspector' ? 0 : undefined,
          opacity: panelMode === 'inspector' ? 0 : 1,
          pointerEvents: panelMode === 'inspector' ? 'none' : undefined,
          overflow: 'hidden',
        }}
      >
      <Card className="flex flex-col overflow-hidden border-white/60 bg-[#fbfaf6]/85 h-full">
        <CardHeader className="border-b border-border/70 bg-white/80 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Espace de planification
                </div>
                <CardTitle className="mt-1 text-xl">Grille et Gantt integres</CardTitle>
              </div>
              {/* ── Panel mode switcher ── */}
              <div
                className="flex items-center gap-0.5 rounded-xl p-1 shrink-0"
                style={{ background: 'rgba(0,0,0,0.055)', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                {PANEL_MODES.map(({ mode, label, title, icon }) => (
                  <button
                    key={mode}
                    type="button"
                    title={title}
                    onClick={() => setPanelMode(mode)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200"
                    style={
                      panelMode === mode
                        ? { background: 'linear-gradient(135deg, #1a4a20, #56a45b)', color: 'white', boxShadow: '0 2px 8px rgba(86,164,91,0.35)' }
                        : { color: 'rgba(0,0,0,0.45)', background: 'transparent' }
                    }
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={icon} />
                    </svg>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrer les taches, le WBS ou les notes"
                className="w-56 bg-white"
              />
              <form action={createTaskAction}>
                <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                <input
                  type="hidden"
                  name="parentId"
                  value={selectedTask?.parentId ?? ""}
                />
                <Button variant="outline" type="submit">
                  {selectedTask ? "Ajouter une soeur" : "Ajouter une tache racine"}
                </Button>
              </form>
              <form action={createTaskAction}>
                <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                <input type="hidden" name="parentId" value={selectedTask?.id ?? ""} />
                <Button type="submit" disabled={!selectedTask}>
                  Ajouter un enfant
                </Button>
              </form>
              <form action={createTaskAction}>
                <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                <input
                  type="hidden"
                  name="parentId"
                  value={selectedTask?.parentId ?? ""}
                />
                <input type="hidden" name="type" value="MILESTONE" />
                <input type="hidden" name="name" value="Nouveau jalon" />
                <Button variant="outline" type="submit">
                  Ajouter un jalon
                </Button>
              </form>
              <form action={captureBaselineAction}>
                <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                <input
                  type="hidden"
                  name="baselineName"
                  value={`Baseline de travail ${new Date().toLocaleDateString("fr-FR")}`}
                />
                <input type="hidden" name="capturedBy" value={view.aggregate.project.ownerName} />
                <Button variant="secondary" type="submit">
                  Capturer la baseline
                </Button>
              </form>
              <div
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-medium",
                  ganttState.status === "error"
                    ? "bg-rose-50 text-rose-700"
                    : ganttState.status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                )}
              >
                {ganttPending
                  ? "Application du geste Gantt..."
                  : ganttState.message ||
                    "Gantt direct: glissez une barre, ou redimensionnez ses bords."}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                {(Object.keys(DENSITY_CONFIG) as DensityMode[]).map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    title={`Ctrl+${index + 1}`}
                    onClick={() => setDensity(mode)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      density === mode ? "bg-white text-[#1a4a20] shadow-sm" : "text-slate-500",
                    )}
                  >
                    {DENSITY_CONFIG[mode].label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowBaseline((current) => !current)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold",
                  showBaseline ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                Baseline
              </button>
              <button
                type="button"
                onClick={() => setShowCriticalOnly((current) => !current)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold",
                  showCriticalOnly ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                Critique
              </button>
              <div className="rounded-full bg-white px-3 py-2 text-xs text-slate-500">
                {keyboardNotice}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
          {view.schedule.issues.length ? (
            <div className="border-b border-amber-200 bg-amber-50/90 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                Alertes planning
              </div>
              <div className="mt-2 flex flex-col gap-2 text-sm text-amber-900">
                {view.schedule.issues.slice(0, 3).map((issue) => (
                  <div key={`${issue.code}-${issue.taskId ?? 'global'}`}>{issue.message}</div>
                ))}
              </div>
            </div>
          ) : null}
          {hasTasks ? (
            <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden' }}>
              {/* ── SOMMAIRE (task grid) ── */}
              <div
                className="border-r border-border/70 bg-white/75 overflow-hidden flex-shrink-0 flex flex-col"
                style={{
                  transition: `width 0.38s ${EASING}`,
                  width: panelMode === 'grid' ? '100%' : panelMode === 'gantt' ? 200 : 390,
                  maxWidth: panelMode === 'grid' ? undefined : panelMode === 'gantt' ? 200 : 390,
                }}
              >
                {/* Column headers — hide DEBUT/FIN/DUR/MARGE in narrow (gantt) mode */}
                {panelMode === 'gantt' ? (
                  <div className="flex h-14 items-center border-b border-border/70 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Taches
                  </div>
                ) : (
                <div className="grid h-14 grid-cols-[60px_minmax(0,1fr)_80px_80px_60px_70px] items-center border-b border-border/70 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shrink-0">
                  <div>WBS</div>
                  <div>Tache</div>
                  <div>Debut</div>
                  <div>Fin</div>
                  <div>Dur.</div>
                  <div>Marge</div>
                </div>
                )}
                <div className="overflow-y-auto flex-1">
                  {hasFilteredTasks ? (
                    filteredTasks.map((task) => {
                      const owners = getTaskOwners(view, task.id);
                      const selected = selectedTask?.id === task.id;
                      const isNarrow = panelMode === 'gantt';

                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={cn(
                            "w-full items-center border-b border-border/50 px-3 text-left transition flex",
                            isNarrow ? "gap-1.5" : "grid",
                            !isNarrow && "grid-cols-[60px_minmax(0,1fr)_80px_80px_60px_70px]",
                            selected
                              ? "bg-teal-950/[0.06]"
                              : "bg-transparent hover:bg-slate-100/70",
                          )}
                          style={{ height: rowHeight }}
                          onClick={() =>
                            startTransition(() => {
                              setSelectedTaskId(task.id);
                            })
                          }
                        >
                          {isNarrow ? (
                            /* Narrow mode: just coloured dot + name */
                            <>
                              <span
                                className="shrink-0 size-2 rounded-full"
                                style={{
                                  background: task.isCritical ? '#e55353' : task.status === 'DONE' ? '#56a45b' : '#94a3b8',
                                  marginLeft: `${task.depth * 10}px`,
                                }}
                              />
                              <span className="truncate text-xs font-medium text-slate-800">
                                {task.name}
                              </span>
                            </>
                          ) : (
                            /* Full mode: all columns */
                            <>
                              <div className="text-xs font-semibold text-slate-500">{task.wbsCode}</div>
                              <div className="min-w-0" style={{ paddingLeft: `${task.depth * 14}px` }}>
                                <div className={cn("truncate font-medium text-slate-950", densityConfig.taskText)}>
                                  {task.name}
                                </div>
                                <div className={cn("truncate text-slate-500", densityConfig.subText)}>
                                  {owners.length ? owners.join(", ") : formatTaskTypeLabel(task.type)}
                                </div>
                              </div>
                              <div className="text-xs text-slate-700">
                                {formatDateLabel(task.scheduledStartDate)}
                              </div>
                              <div className="text-xs text-slate-700">
                                {formatDateLabel(task.scheduledFinishDate)}
                              </div>
                              <div className="text-xs text-slate-700">{task.durationDays}d</div>
                              <div
                                className={cn(
                                  "text-xs font-semibold",
                                  (task.totalSlackDays ?? 0) <= 0
                                    ? "text-rose-700"
                                    : "text-slate-700",
                                )}
                              >
                                {task.totalSlackDays ?? 0}d
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-6 py-12 text-sm text-slate-500">
                      Aucune tache ne correspond au filtre actuel. Effacez la recherche pour retrouver toute la decomposition.
                    </div>
                  )}
                </div>
              </div>
              {/* ── GANTT (timeline) ── */}
              <div
                className="bg-[#f3f5f4] flex-1 min-w-0"
                style={{
                  transition: TRANS,
                  overflow: panelMode === 'grid' ? 'hidden' : 'auto',
                  maxWidth: panelMode === 'grid' ? 0 : undefined,
                  opacity: panelMode === 'grid' ? 0 : 1,
                  pointerEvents: panelMode === 'grid' ? 'none' : undefined,
                }}
              >
                {hasFilteredTasks ? (
                  <div style={{ width: timelineWidth }}>
                    <div className="sticky top-0 z-20 grid h-14 grid-flow-col border-b border-border/70 bg-[#f3f5f4]/95 backdrop-blur">
                      {timelineDays.map((date) => {
                        const day = parseIsoDate(date);
                        const workday = isWorkingDay(date, view.aggregate.calendar);
                        const isMonthBoundary = day.getUTCDate() === 1;
                        return (
                          <div
                            key={date}
                            className={cn(
                              "flex h-14 flex-col items-center justify-center border-r border-border/60 text-[10px] font-semibold uppercase tracking-[0.12em]",
                              workday
                                ? "bg-transparent text-slate-600"
                                : "bg-slate-200/50 text-slate-400",
                            )}
                            style={{ width: cellWidth }}
                          >
                            <div>{WEEKDAY_LABELS[day.getUTCDay()]}</div>
                            <div className="text-xs tracking-normal text-slate-800">
                              {day.getUTCDate()}
                            </div>
                            {isMonthBoundary ? (
                              <div className="text-[9px] text-teal-700">
                                {day.toLocaleString("en-GB", {
                                  month: "short",
                                  timeZone: "UTC",
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="relative">
                      <svg
                        className="pointer-events-none absolute inset-0 z-10"
                        width={timelineWidth}
                        height={filteredTasks.length * rowHeight}
                        aria-hidden="true"
                      >
                        {ganttDependencies
                          .map((dependency) => {
                            const path = getDependencyPath(
                              dependency,
                              taskPositions,
                              timelineStart,
                              cellWidth,
                              rowHeight,
                            );

                            if (!path) {
                              return null;
                            }

                            return (
                              <path
                                key={dependency.id}
                                d={path}
                                fill="none"
                                stroke="rgba(15, 23, 42, 0.38)"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                              />
                            );
                          })}
                      </svg>
                      {filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "relative border-b border-border/50",
                            selectedTask?.id === task.id
                              ? "bg-teal-950/[0.05]"
                              : "bg-transparent",
                          )}
                          style={{ height: rowHeight }}
                        >
                          <div className="absolute inset-y-0 left-0 right-0 grid grid-flow-col">
                            {timelineDays.map((date) => (
                              <div
                                key={`${task.id}-${date}`}
                                className={cn(
                                  "border-r border-border/40",
                                  isWorkingDay(date, view.aggregate.calendar)
                                    ? "bg-transparent"
                                    : "bg-slate-300/25",
                                )}
                                style={{ width: cellWidth }}
                              />
                            ))}
                          </div>
                          <TimelineBar
                            task={task}
                            baseline={view.baselineVarianceByTaskId[task.id]?.snapshot}
                            timelineStart={timelineStart}
                            cellWidth={cellWidth}
                            showBaseline={showBaseline}
                            owners={getTaskOwners(view, task.id)}
                            selected={selectedTask?.id === task.id}
                            onSelect={() => setSelectedTaskId(task.id)}
                            onScheduleCommit={commitGanttSchedule}
                          />
                          <div
                            className="absolute inset-0 z-20 cursor-pointer"
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                          {task.progressPercent > 0 && task.type !== "SUMMARY" ? (
                            <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                              {formatPercent(task.progressPercent)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center px-8 text-center text-sm text-slate-500">
                    Le calendrier est masque car le filtre actuel retire toutes les taches visibles.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                eyebrow="Plan vide"
                title="Creer la premiere ligne de planification"
                description="Commencez par une tache racine ou un jalon, puis construisez la hierarchie, la logique, les ressources et les baselines autour d'un vrai reseau de planning."
                ctaAction={
                  <div className="flex flex-wrap gap-3">
                    <form action={createTaskAction}>
                      <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                      <Button type="submit">Ajouter une tache racine</Button>
                    </form>
                    <form action={createTaskAction}>
                      <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                      <input type="hidden" name="type" value="MILESTONE" />
                      <input type="hidden" name="name" value="Nouveau jalon" />
                      <Button type="submit" variant="outline">
                        Ajouter un jalon
                      </Button>
                    </form>
                  </div>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
      </div>{/* end LEFT BLOCK */}

      {/* ── RIGHT BLOCK (Inspector + Dependencies) ── */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          transition: TRANS,
          width: panelMode === 'gantt' ? 0 : panelMode === 'inspector' ? undefined : 360,
          flex: panelMode === 'inspector' ? '1 1 0' : undefined,
          opacity: panelMode === 'gantt' ? 0 : 1,
          pointerEvents: panelMode === 'gantt' ? 'none' : undefined,
          minWidth: panelMode === 'inspector' ? 0 : undefined,
        }}
      >
      <div className="space-y-5 h-full overflow-y-auto pr-0.5">
        <Card className="border-white/70 bg-white/95">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-xl">Inspecteur de tache</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Mettez a jour la ligne selectionnee, puis affinez la logique des precedences
              ou capturez une baseline quand le planning est stabilise.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            {selectedTask ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge status={selectedTask.status} />
                    <PriorityBadge priority={selectedTask.priority} />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {selectedTask.wbsCode}
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950">
                      {selectedTask.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {selectedTask.scheduledStartDate && selectedTask.scheduledFinishDate
                        ? `${formatLongDate(selectedTask.scheduledStartDate)} au ${formatLongDate(selectedTask.scheduledFinishDate)}`
                        : "Cette tache n'est pas encore entierement planifiee."}
                    </div>
                  </div>
                </div>

                <form
                  key={`${selectedTask.id}-outline`}
                  action={moveAction}
                  className="rounded-2xl border border-border/70 bg-slate-50 p-4"
                >
                  <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Edition du plan
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Deplacez la branche selectionnee dans la decomposition sans editer manuellement la structure WBS.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        name="direction"
                        value="UP"
                        disabled={movePending}
                      >
                        Monter
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        name="direction"
                        value="DOWN"
                        disabled={movePending}
                      >
                        Descendre
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        name="direction"
                        value="INDENT"
                        disabled={movePending}
                      >
                        Indenter
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        name="direction"
                        value="OUTDENT"
                        disabled={movePending}
                      >
                        Desindenter
                      </Button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-3 text-sm",
                      moveState.status === "error"
                        ? "text-rose-700"
                        : moveState.status === "success"
                          ? "text-emerald-700"
                          : "text-slate-500",
                    )}
                  >
                    {moveState.message ||
                      "Les mouvements renumerotent immediatement le WBS et preservent la hierarchie."}
                  </div>
                </form>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Fenetre de planning
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Debut au plus tot</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.earliestStartDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Fin au plus tot</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.earliestFinishDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Debut au plus tard</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.latestStartDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Fin au plus tard</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.latestFinishDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Signaux de pilotage
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Mode de planning</span>
                        <span className="font-medium">
                          {getSchedulingModeLabel(selectedTask.schedulingMode)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Formule de charge</span>
                        <span className="font-medium">
                          {getWorkFormulaLabel(selectedTask.workFormula)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Charge planifiee</span>
                        <span className="font-medium">
                          {formatHours(selectedTask.effortHours)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Charge reelle</span>
                        <span className="font-medium">
                          {formatHours(selectedTask.actualWorkHours)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Charge restante</span>
                        <span className="font-medium">
                          {formatHours(selectedTask.remainingWorkHours)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Unites affectees</span>
                        <span className="font-medium">
                          {selectedTask.isSummary
                            ? "Consolidee"
                            : selectedTaskAllocationPct > 0
                              ? formatPercent(selectedTaskAllocationPct)
                              : "Non affecte"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Capacite quotidienne</span>
                        <span className="font-medium">
                          {selectedTask.isSummary
                            ? "Consolidee"
                            : formatHours(selectedTaskDailyCapacity)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Marge totale</span>
                        <span className="font-medium">
                          {selectedTask.totalSlackDays ?? 0}d
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Marge libre</span>
                        <span className="font-medium">
                          {selectedTask.freeSlackDays ?? 0}d
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Contrainte</span>
                        <span className="text-right font-medium">
                          {getConstraintLabel(selectedTask.constraintType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Debut reel</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.actualStartDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Fin reelle</span>
                        <span className="font-medium">
                          {formatDateLabel(selectedTask.actualFinishDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Echeance</span>
                        <span
                          className={cn(
                            "font-medium",
                            selectedTask.deadlineDate &&
                              selectedTask.scheduledFinishDate &&
                              compareIsoDates(
                                selectedTask.scheduledFinishDate,
                                selectedTask.deadlineDate,
                              ) > 0
                              ? "text-rose-700"
                              : "text-slate-700",
                          )}
                        >
                          {formatDateLabel(selectedTask.deadlineDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Cout reel</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedTaskVariance?.actualCost ?? 0,
                            view.aggregate.project.currencyCode,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>VP / VA</span>
                        <span className="text-right font-medium">
                          {formatCurrency(
                            selectedTaskVariance?.plannedValue ?? 0,
                            view.aggregate.project.currencyCode,
                          )}{" "}
                          /{" "}
                          {formatCurrency(
                            selectedTaskVariance?.earnedValue ?? 0,
                            view.aggregate.project.currencyCode,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTaskIssues.length ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                      Alertes de planning de la tache
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-amber-900">
                      {selectedTaskIssues.map((issue) => (
                        <div key={`${selectedTask.id}-${issue.code}`}>
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTask.levelingDelayDays > 0 ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                      Retard de lissage
                    </div>
                    <div className="mt-3 text-sm text-sky-900">
                      Cette tache est retardee de {selectedTask.levelingDelayDays} jour(s) ouvre(s) pour respecter la capacite ressource. Effacez ou relancez le lissage depuis la vue ressources si le staffing change.
                    </div>
                  </div>
                ) : null}

                <form
                  key={selectedTask.id}
                  action={taskAction}
                  className="space-y-4"
                >
                  <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Nom
                      <Input name="name" defaultValue={selectedTask.name} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Description
                      <Textarea
                        name="description"
                        defaultValue={selectedTask.description}
                        className="min-h-[96px]"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Notes
                      <Textarea
                        name="notes"
                        defaultValue={selectedTask.notes}
                        className="min-h-[88px]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Parent
                      <Select name="parentId" defaultValue={selectedTask.parentId ?? ""}>
                        <option value="">Niveau racine</option>
                        {view.tasks
                          .filter((task) => task.id !== selectedTask.id && task.isSummary)
                          .map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.wbsCode} {task.name}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Ordre
                      <Input name="sortOrder" type="number" defaultValue={selectedTask.sortOrder} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Type
                      <Select name="type" defaultValue={selectedTask.type}>
                        <option value="TASK">Tache</option>
                        <option value="SUMMARY">Recapitulatif</option>
                        <option value="MILESTONE">Jalon</option>
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Statut
                      <Select name="status" defaultValue={selectedTask.status}>
                        <option value="NOT_STARTED">Non demarree</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="BLOCKED">Bloquee</option>
                        <option value="DONE">Terminee</option>
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Priorite
                      <Select name="priority" defaultValue={selectedTask.priority}>
                        <option value="LOW">Faible</option>
                        <option value="MEDIUM">Normale</option>
                        <option value="HIGH">Elevee</option>
                        <option value="URGENT">Urgente</option>
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Avancement %
                      <Input
                        name="progressPercent"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={selectedTask.progressPercent}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Duree (jours)
                      <Input
                        name="durationDays"
                        type="number"
                        min={0}
                        defaultValue={selectedTask.durationDays}
                        readOnly={selectedTask.isSummary}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Mode de planification
                      <Select
                        name="schedulingMode"
                        defaultValue={selectedTask.schedulingMode}
                      >
                        {SCHEDULING_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Formule de charge
                      <Select
                        name="workFormula"
                        defaultValue={selectedTask.workFormula}
                      >
                        {WORK_FORMULA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Calendrier de tache
                      <Select
                        name="calendarMode"
                        defaultValue={selectedTask.calendarMode}
                      >
                        <option value="PROJECT">Utiliser le calendrier du projet</option>
                        <option value="CUSTOM">Calendrier de tache personnalise</option>
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Charge (heures)
                      <Input
                        name="effortHours"
                        type="number"
                        min={0}
                        step="0.25"
                        defaultValue={selectedTask.effortHours ?? 0}
                        readOnly={selectedTask.isSummary || selectedTask.type === "MILESTONE"}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Heures de tache / jour
                      <Input
                        name="taskCalendarHoursPerDay"
                        type="number"
                        min={1}
                        max={24}
                        defaultValue={selectedTask.calendarHoursPerDay ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Priorite de lissage
                      <Input
                        name="levelingPriority"
                        type="number"
                        min={0}
                        max={1000}
                        defaultValue={selectedTask.levelingPriority}
                        readOnly={selectedTask.isSummary}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Charge reelle (heures)
                      <Input
                        name="actualWorkHours"
                        type="number"
                        min={0}
                        step="0.25"
                        defaultValue={selectedTask.actualWorkHours ?? 0}
                        readOnly={selectedTask.isSummary}
                      />
                    </label>
                    <div className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                      <div>Semaine ouvrée de la tache</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {WORKING_DAY_OPTIONS.map((day) => (
                          <label
                            key={day.value}
                            className="flex items-center gap-2 rounded-xl border border-border/70 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              name="taskCalendarWorkingDays"
                              value={day.value}
                              defaultChecked={selectedTask.calendarWorkingDays.includes(
                                day.value,
                              )}
                              className="size-4 rounded border-slate-300"
                            />
                            <span>{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                      Exceptions du calendrier de tache
                      <Textarea
                        name="taskCalendarExceptions"
                        defaultValue={serializeCalendarExceptions(
                          selectedTask.calendarExceptions,
                        )}
                        className="min-h-[110px] font-mono text-xs"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Charge restante (heures)
                      <Input
                        name="remainingWorkHours"
                        type="number"
                        min={0}
                        step="0.25"
                        defaultValue={selectedTask.remainingWorkHours ?? 0}
                        readOnly={selectedTask.isSummary}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Constraint
                      <Select
                        name="constraintType"
                        defaultValue={selectedTask.constraintType}
                      >
                        {CONSTRAINT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Date de contrainte
                      <Input
                        name="constraintDate"
                        type="date"
                        defaultValue={selectedTask.constraintDate ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Date d'echeance
                      <Input
                        name="deadlineDate"
                        type="date"
                        defaultValue={selectedTask.deadlineDate ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Debut manuel
                      <Input
                        name="manualStartDate"
                        type="date"
                        defaultValue={selectedTask.manualStartDate ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Fin manuelle
                      <Input
                        name="manualFinishDate"
                        type="date"
                        defaultValue={selectedTask.manualFinishDate ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Debut reel
                      <Input
                        name="actualStartDate"
                        type="date"
                        defaultValue={selectedTask.actualStartDate ?? ""}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Fin reelle
                      <Input
                        name="actualFinishDate"
                        type="date"
                        defaultValue={selectedTask.actualFinishDate ?? ""}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                    La planification automatique suit les dependances et les contraintes. La planification manuelle
                    preserve les dates saisies et remonte une alerte en cas de conflit avec le reseau.
                    La duree fixe recalcule la charge a partir des unites ; la charge fixe et les unites fixes
                    preservent la charge planifiee et rederivent la duree depuis la capacite disponible.
                    Les calendriers de tache, la priorite de lissage, la charge reelle, la charge restante et
                    les dates reelles alimentent le meme modele de planning, de consommation et d'ecarts de baseline.
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={cn(
                        "text-sm",
                        taskState.status === "error"
                          ? "text-rose-700"
                          : taskState.status === "success"
                            ? "text-emerald-700"
                            : "text-slate-500",
                      )}
                    >
                      {taskState.message || "Les changements enregistres declenchent un recalcul du planning."}
                    </div>
                    <Button type="submit" disabled={taskPending}>
                      {taskPending ? "Enregistrement..." : "Enregistrer la tache"}
                    </Button>
                  </div>
                </form>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm">
                  <div className="text-rose-800">
                    Supprimez cette {selectedTask.isSummary ? "branche" : "tache"} ainsi que les affectations, dependances et snapshots de baseline lies.
                  </div>
                  <form action={deleteTaskAction}>
                    <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                    <input type="hidden" name="taskId" value={selectedTask.id} />
                    <Button type="submit" variant="destructive">
                      Supprimer {selectedTask.isSummary ? "la branche" : "la tache"}
                    </Button>
                  </form>
                </div>

                {!selectedTask.isSummary ? (
                  <form
                    key={`${selectedTask.id}-dependency`}
                    action={dependencyAction}
                    className="space-y-4 border-t border-border/70 pt-5"
                  >
                    <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                    <input
                      type="hidden"
                      name="successorProjectId"
                      value={view.aggregate.project.id}
                    />
                    <input type="hidden" name="successorTaskId" value={selectedTask.id} />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Ajouter une logique de precedente
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Ajoutez une logique a la tache selectionnee depuis ce projet ou n'importe quel plan connecte.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Projet precedent
                        <Select
                          name="predecessorProjectId"
                          value={selectedPredecessorProject?.projectId ?? view.aggregate.project.id}
                          onChange={(event) =>
                            setSelectedPredecessorProjectId(event.target.value)
                          }
                        >
                          {dependencyProjectOptions.map((projectOption) => (
                            <option
                              key={projectOption.projectId}
                              value={projectOption.projectId}
                            >
                              {projectOption.code} {projectOption.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Tache precedente
                        <Select name="predecessorTaskId" defaultValue="">
                          <option value="" disabled>
                            Choisir une precedente
                          </option>
                          {availablePredecessorTasks.map((task) => (
                            <option key={task.taskId} value={task.taskId}>
                              {task.wbsCode} {task.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Type de lien
                        <Select name="type" defaultValue="FS">
                          <option value="FS">FS</option>
                          <option value="SS">SS</option>
                          <option value="FF">FF</option>
                          <option value="SF">SF</option>
                        </Select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Retard / avance (jours)
                        <Input name="lagDays" type="number" defaultValue={0} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "text-sm",
                          dependencyState.status === "error"
                            ? "text-rose-700"
                            : dependencyState.status === "success"
                              ? "text-emerald-700"
                              : "text-slate-500",
                        )}
                      >
                        {dependencyState.message || "Les precedences recalculent le Gantt immediatement."}
                      </div>
                      <Button type="submit" variant="outline" disabled={dependencyPending}>
                        {dependencyPending ? "Enregistrement..." : "Ajouter la precedente"}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-slate-600">
                Selectionnez une tache dans la grille pour l'inspecter et la modifier.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/95">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-lg">Contexte de dependance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Precedentes
              </div>
              <div className="mt-3 space-y-2">
                {predecessorLinks.length ? (
                  predecessorLinks.map((entry) => {
                    return (
                      <div
                        key={entry.dependency.id}
                        className="rounded-2xl border border-border/60 bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-950">
                              {entry.predecessor.projectCode} {entry.predecessor.projectName}
                            </div>
                            <div className="mt-1 text-slate-700">
                              {(entry.predecessor.wbsCode ?? "Tache")} {entry.predecessor.taskName}
                            </div>
                            <div className="mt-1 text-slate-600">
                              {entry.dependency.type}{" "}
                              {entry.dependency.lagDays >= 0
                                ? `+${entry.dependency.lagDays}`
                                : entry.dependency.lagDays}
                              d
                              {entry.externalToProject ? " · Externe" : ""}
                            </div>
                          </div>
                          <form action={deleteDependencyAction}>
                            <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                            <input type="hidden" name="dependencyId" value={entry.dependency.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-rose-700">
                              Retirer
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">
                    Aucune logique de precedence n'est encore definie.
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Successeurs
              </div>
              <div className="mt-3 space-y-2">
                {successorLinks.length ? (
                  successorLinks.map((entry) => {
                    return (
                      <div
                        key={entry.dependency.id}
                        className="rounded-2xl border border-border/60 bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-950">
                              {entry.successor.projectCode} {entry.successor.projectName}
                            </div>
                            <div className="mt-1 text-slate-700">
                              {(entry.successor.wbsCode ?? "Tache")} {entry.successor.taskName}
                            </div>
                            <div className="mt-1 text-slate-600">
                              {entry.dependency.type}{" "}
                              {entry.dependency.lagDays >= 0
                                ? `+${entry.dependency.lagDays}`
                                : entry.dependency.lagDays}
                              d
                              {entry.externalToProject ? " · Externe" : ""}
                            </div>
                          </div>
                          <form action={deleteDependencyAction}>
                            <input type="hidden" name="projectId" value={view.aggregate.project.id} />
                            <input type="hidden" name="dependencyId" value={entry.dependency.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-rose-700">
                              Retirer
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">
                    Cette tache ne pilote actuellement aucun travail en aval.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/70 pt-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Liens de vue
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/projects/${view.aggregate.project.id}/dashboard`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Tableau de bord
                </Link>
                <Link
                  href={`/projects/${view.aggregate.project.id}/resources`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Ressources
                </Link>
                <Link
                  href={`/projects/${view.aggregate.project.id}/baselines`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Baselines
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>{/* end RIGHT BLOCK */}
    </div>

    {/* Keyboard help modal */}
    {showKeyboardHelp && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setShowKeyboardHelp(false)}
      >
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-white/60 bg-white/95 p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200"
            onClick={() => setShowKeyboardHelp(false)}
          >
            Fermer
          </button>
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Aide</div>
            <h2 className="mt-1 text-xl font-black text-[#1a4a20]">Raccourcis clavier</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                category: "Navigation rapide (G + ...)",
                shortcuts: [
                  ["G P", "Planning / Gantt"],
                  ["G D", "Tableau de bord"],
                  ["G R", "Ressources"],
                  ["G B", "Baselines"],
                  ["G L", "Look-ahead 4 semaines"],
                  ["G A", "Analytics (ES, Monte Carlo)"],
                  ["G S", "Rapport soutenance"],
                  ["G N", "Reseau PERT"],
                ],
              },
              {
                category: "Planification",
                shortcuts: [
                  ["N", "Nouvelle tache au meme niveau"],
                  ["Ctrl+M", "Convertir en jalon"],
                  ["Ctrl+D", "Dupliquer la tache"],
                  ["Ctrl+G", "Creer un groupe recapitulatif"],
                  ["Alt + Gauche", "Diminuer le niveau WBS"],
                  ["Alt + Droite", "Augmenter le niveau WBS"],
                  ["Ctrl + Haut/Bas", "Deplacer la tache"],
                  ["Delete", "Supprimer la tache selectionnee"],
                ],
              },
              {
                category: "Affichage",
                shortcuts: [
                  ["Ctrl+1", "Densite compacte"],
                  ["Ctrl+2", "Densite normale"],
                  ["Ctrl+3", "Densite confort"],
                  ["+  /  -", "Zoomer / dezoomer le Gantt"],
                  ["F", "Ajuster le zoom (fit)"],
                  ["T", "Afficher la date du jour"],
                  ["B", "Afficher/masquer la baseline"],
                  ["C", "Filtrer chemin critique uniquement"],
                ],
              },
              {
                category: "Divers",
                shortcuts: [
                  ["? ", "Afficher/masquer cette aide"],
                  ["Ctrl+Z", "Annuler (undo)"],
                  ["Ctrl+Y", "Refaire (redo)"],
                  ["Haut / Bas", "Naviguer entre les taches"],
                  ["Echap", "Fermer les panneaux"],
                ],
              },
            ].map(({ category, shortcuts }) => (
              <div key={category}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{category}</div>
                <div className="space-y-1">
                  {shortcuts.map(([keys, desc]) => (
                    <div key={keys} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{keys}</span>
                      <span className="text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
