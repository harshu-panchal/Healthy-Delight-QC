import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import homeBg2 from "../../../assets/Home_Bg_2.png";

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
        perks: ["Free delivery on eligible orders", "Early access to offers", "Priority support"],
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
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#EADDCF" }}
    >
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${homeBg2})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundAttachment: "fixed",
          opacity: 0.2,
          filter: "blur(0.5px)",
          transform: "scale(1.02)",
        }}
      />
      <div className="relative z-10">
        <div className="px-4 md:px-6 lg:px-8 py-4 border-b border-[#8A6642]/10 sticky top-0 bg-[#E6D5C3]/30 backdrop-blur-md z-10">
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
          <div className="bg-[#DFCBB7]/40 border-y border-[#8A6642]/10 py-6 -mx-4 md:-mx-8 px-4 md:px-8 mb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#8A6642]">
                  Healthy Delight Plus
                </h2>
                <p className="text-sm text-neutral-700 mt-1 max-w-xs">
                  Get free delivery and extra savings with a subscription.
                </p>
              </div>
              <div className="shrink-0 px-3 py-1 rounded-full bg-[#8A6642] text-white text-[10px] font-bold uppercase tracking-wider">
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
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${isSelected
                    ? "border-[#8A6642] bg-[#DFCBB7] shadow-md scale-[1.02]"
                    : "border-[#8A6642]/20 bg-[#E6D5C3]/60 hover:bg-[#E6D5C3]/80"
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
                    <div className="px-2.5 py-1 rounded-full bg-white/40 text-neutral-900 text-[10px] font-bold border border-[#8A6642]/40 shadow-sm">
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

          <div className="pt-12 mt-8 border-t border-[#8A6642]/20 flex flex-col items-center">
            <button
              type="button"
              onClick={() =>
                alert(
                  "Static screen: Subscription purchase flow not implemented yet."
                )
              }
              className="group relative w-full max-w-md overflow-hidden rounded-3xl bg-[#8A6642] p-1 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_-15px_rgba(138,102,66,0.3)]"
            >
              <div className="flex items-center justify-between px-6 py-4 bg-white/5 rounded-[22px] backdrop-blur-sm">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-widest text-[#E6D5C3] font-bold">
                    Selected: {selected?.title}
                  </div>
                  <div className="text-xl font-black text-white">
                    {selected?.price}<span className="text-xs font-normal opacity-70 ml-1">{selected?.cadence}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-[#FFC94A] px-5 py-2.5 rounded-2xl text-[#1f2937] font-black text-sm group-hover:bg-white transition-colors shadow-lg">
                  Continue
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </button>

            <p className="mt-6 text-[10px] text-neutral-400 italic font-medium opacity-60">
              By continuing, you agree this is a demo subscription UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

