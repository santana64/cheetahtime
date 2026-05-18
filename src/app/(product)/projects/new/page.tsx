import { CreateProjectForm } from "@/features/projects/create-project-form";
import { BtpTemplateLauncher } from "@/features/projects/btp-template-launcher";
import { ProjectTemplateLauncher } from "@/features/projects/project-template-launcher";
import { requireCurrentSession } from "@/services/auth";
import { listBtpTemplates } from "@/services/btp-templates";
import { listProjectTemplates } from "@/services/templates";

export default async function NewProjectPage() {
  const session = await requireCurrentSession();
  const templates = await listProjectTemplates(session.workspaceId);
  const btpTemplates = listBtpTemplates();
  const defaultStartDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px] animate-velocity-enter">
      <div className="space-y-6">
        <CreateProjectForm />
        <BtpTemplateLauncher templates={btpTemplates} defaultStartDate={defaultStartDate} />
        <ProjectTemplateLauncher templates={templates} />
      </div>

      {/* Panneau info — style Cheetah Time */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #1a4a20 0%, #0e2714 60%, #0d1f10 100%)",
          border: "1px solid rgba(86,164,91,0.20)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(86,164,91,0.15)",
        }}
      >
        {/* Speed lines */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-62deg, transparent, transparent 38px, rgba(255,255,255,0.020) 38px, rgba(255,255,255,0.020) 39px)",
          }}
          aria-hidden="true"
        />

        {/* Top bar vert→orange */}
        <div
          className="h-[3px] w-full animate-gradient-x"
          style={{
            background: "linear-gradient(90deg, #1a4a20, #56a45b, #f4a321, #56a45b, #1a4a20)",
            backgroundSize: "200% 100%",
          }}
        />

        <div className="relative p-6">
          {/* Header */}
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(86,164,91,0.70)" }}>
              Ce qui est créé
            </div>
            <h2 className="mt-1 text-[16px] font-black text-white" style={{ letterSpacing: "-0.02em" }}>
              Votre projet de planification
            </h2>
            {/* Séparateur */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-[2px] w-6 rounded-full" style={{ background: "#56a45b" }} />
              <div className="h-[2px] w-3 rounded-full" style={{ background: "#f4a321" }} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {[
              {
                label: "Calendrier de livraison",
                desc: "Temps ouvrés en semaine, règles d'exception, dérive planning calculée automatiquement.",
              },
              {
                label: "Structure de départ (WBS)",
                desc: "Lancement, planification, exécution — décomposition prête à personnaliser.",
              },
              {
                label: "Accès immédiat",
                desc: "Tableau de bord, espace de planification, ressources et référentiels disponibles dès la création.",
              },
              {
                label: "Persistance locale",
                desc: "Mode serveur local utilisable sans base active — aucune interruption de build.",
              },
            ].map(({ label, desc }, i) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl p-3 animate-blur-reveal"
                style={{
                  animationDelay: `${100 + i * 80}ms`,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(86,164,91,0.14)",
                }}
              >
                {/* Dot vert */}
                <div className="mt-1 flex shrink-0 items-center">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#56a45b", boxShadow: "0 0 6px rgba(86,164,91,0.60)" }}
                  />
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-white">{label}</div>
                  <div className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.48)" }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Brand footer */}
          <div className="mt-6 flex items-center gap-2.5 opacity-35">
            <div className="h-px flex-1 rounded-full" style={{ background: "#56a45b" }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white">
              CheetahSoft
            </span>
            <div className="h-px flex-1 rounded-full" style={{ background: "#f4a321" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
