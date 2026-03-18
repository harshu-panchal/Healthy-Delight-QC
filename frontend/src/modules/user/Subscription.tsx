import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type PlanId = "Quaterly" | "monthly" | "yearly";

export default function Subscription() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("Quaterly");

  const plans = useMemo(
    () => [
       {
        id: "monthly" as const,
        title: "Monthly",
        price: "₹149",
        cadence: "/month",
        perks: [
          "Free delivery on eligible orders",
          "Extra savings on selected items",
          ,
        ],
        badge: "Starter",
      },
      {
        id: "Quaterly" as const,
        title: "Quaterly",
        price: "₹499",
        cadence: "/quaterly",
        perks: ["Free delivery on eligible orders", "Early access to offers","Priority support"],
        badge: "Best Value",
      },
     
      {
        id: "yearly" as const,
        title: "Yearly",
        price: "₹999",
        cadence: "/year",
        perks: [
          "Free delivery on eligible orders",
          "Maximum savings across the app",
          "Priority support",
        ],
        badge: "Save more",
      },
    ],
    []
  );

  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 md:px-6 lg:px-8 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Go back"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-neutral-900">
              Subscription
            </h1>
            <p className="text-[11px] text-neutral-500">
              Static preview (backend not connected yet)
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-5 space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-cream p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900">
                Healthy Delight Plus
              </h2>
              <p className="text-sm text-neutral-700 mt-1">
                Get free delivery and extra savings with a subscription.
              </p>
            </div>
            <div className="shrink-0 px-3 py-1 rounded-full bg-primary text-neutral-900 text-xs font-bold">
              New
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isSelected = p.id === selectedPlan;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlan(p.id)}
                className={`text-left rounded-2xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-white shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      {p.title}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <div className="text-2xl font-black text-neutral-900">
                        {p.price}
                      </div>
                      <div className="text-xs text-neutral-600">{p.cadence}</div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-cream text-neutral-900 text-[10px] font-bold border border-primary/40">
                    {p.badge}
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2 text-xs text-neutral-700">
                      <span className="mt-[2px] w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-neutral-500">
                Selected plan
              </div>
              <div className="text-sm font-bold text-neutral-900">
                {selected?.title} ({selected?.price}
                {selected?.cadence})
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                alert(
                  "Static screen: Subscription purchase flow not implemented yet."
                )
              }
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-neutral-900 font-extrabold text-sm transition-colors"
            >
              Continue
            </button>
          </div>

          <div className="mt-3 text-[11px] text-neutral-500">
            By continuing, you agree this is a demo subscription UI.
          </div>
        </div>
      </div>
    </div>
  );
}

