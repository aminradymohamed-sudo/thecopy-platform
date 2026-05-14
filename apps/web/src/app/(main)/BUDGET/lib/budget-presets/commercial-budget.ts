import { buildBudgetWithTotals } from "../budget-helpers";

import type { Budget } from "../types";

// =============================================================================
// قالب الإعلان التجاري — 2 يوم تصوير، ميزانية ~$100,000
// =============================================================================
export const COMMERCIAL_BUDGET: Budget = buildBudgetWithTotals(
  "USD",
  [
    {
      id: "atl",
      name: "Above The Line",
      color: "#3B82F6",
      categories: [
        {
          code: "12-00",
          name: "Agency & Producers",
          items: [
            {
              code: "12-01",
              description: "Executive Producer",
              amount: 1,
              unit: "Flat",
              rate: 8000,
            },
            {
              code: "12-02",
              description: "Agency Creative Fee",
              amount: 1,
              unit: "Flat",
              rate: 12000,
            },
          ],
        },
        {
          code: "13-00",
          name: "Director",
          items: [
            {
              code: "13-01",
              description: "Director",
              amount: 1,
              unit: "Flat",
              rate: 18000,
            },
            {
              code: "13-04",
              description: "Storyboard / Previs",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
          ],
        },
        {
          code: "14-00",
          name: "Talent",
          items: [
            {
              code: "14-01",
              description: "Principal Talent (Hero)",
              amount: 1,
              unit: "Flat",
              rate: 8000,
            },
            {
              code: "14-02",
              description: "Supporting Talent",
              amount: 3,
              unit: "Flat",
              rate: 1500,
            },
            {
              code: "14-07",
              description: "Casting Director",
              amount: 1,
              unit: "Flat",
              rate: 2500,
            },
          ],
        },
      ],
    },
    {
      id: "production",
      name: "Production Expenses",
      color: "#10B981",
      categories: [
        {
          code: "20-00",
          name: "Production Staff",
          items: [
            {
              code: "20-01",
              description: "Line Producer",
              amount: 4,
              unit: "Day",
              rate: 700,
            },
            {
              code: "20-03",
              description: "1st Assistant Director",
              amount: 2,
              unit: "Day",
              rate: 600,
            },
            {
              code: "20-06",
              description: "Script Supervisor",
              amount: 2,
              unit: "Day",
              rate: 450,
            },
          ],
        },
        {
          code: "22-00",
          name: "Art Direction",
          items: [
            {
              code: "22-01",
              description: "Production Designer",
              amount: 3,
              unit: "Day",
              rate: 700,
            },
            {
              code: "22-04",
              description: "Set Dressing / Props",
              amount: 1,
              unit: "Flat",
              rate: 3000,
            },
          ],
        },
        {
          code: "33-00",
          name: "Wardrobe & Hair/MU",
          items: [
            {
              code: "33-01",
              description: "Stylist / Wardrobe",
              amount: 3,
              unit: "Day",
              rate: 500,
            },
            {
              code: "33-02",
              description: "Hair & Make-Up",
              amount: 2,
              unit: "Day",
              rate: 600,
            },
          ],
        },
      ],
    },
    {
      id: "camera",
      name: "Camera & Electrical",
      color: "#F59E0B",
      categories: [
        {
          code: "30-00",
          name: "Camera Department",
          items: [
            {
              code: "30-01",
              description: "Director of Photography",
              amount: 2,
              unit: "Day",
              rate: 1500,
            },
            {
              code: "30-03",
              description: "1st Asst Camera",
              amount: 2,
              unit: "Day",
              rate: 600,
            },
            {
              code: "30-07",
              description: "Steadicam / Specialty Op",
              amount: 1,
              unit: "Day",
              rate: 1200,
            },
            {
              code: "30-08",
              description: "High-End Camera Package",
              amount: 2,
              unit: "Day",
              rate: 1500,
            },
            {
              code: "30-09",
              description: "Lenses (Premium)",
              amount: 2,
              unit: "Day",
              rate: 800,
            },
          ],
        },
        {
          code: "31-00",
          name: "Electrical / Grip",
          items: [
            {
              code: "31-01",
              description: "Gaffer",
              amount: 2,
              unit: "Day",
              rate: 700,
            },
            {
              code: "31-02",
              description: "Best Boy Electric",
              amount: 2,
              unit: "Day",
              rate: 500,
            },
            {
              code: "31-05",
              description: "Lighting Package",
              amount: 2,
              unit: "Day",
              rate: 1800,
            },
            {
              code: "32-01",
              description: "Key Grip",
              amount: 2,
              unit: "Day",
              rate: 600,
            },
            {
              code: "32-05",
              description: "Grip Package",
              amount: 2,
              unit: "Day",
              rate: 800,
            },
          ],
        },
      ],
    },
    {
      id: "post",
      name: "Post Production",
      color: "#8B5CF6",
      categories: [
        {
          code: "50-00",
          name: "Editorial",
          items: [
            {
              code: "50-01",
              description: "Editor (offline)",
              amount: 1,
              unit: "Flat",
              rate: 4000,
            },
            {
              code: "50-03",
              description: "Colorist (online grade)",
              amount: 1,
              unit: "Flat",
              rate: 3500,
            },
          ],
        },
        {
          code: "51-00",
          name: "Sound & Music",
          items: [
            {
              code: "51-01",
              description: "Sound Design & Mix",
              amount: 1,
              unit: "Flat",
              rate: 2500,
            },
            {
              code: "51-04",
              description: "Music Composition / License",
              amount: 1,
              unit: "Flat",
              rate: 4000,
            },
          ],
        },
        {
          code: "52-00",
          name: "VFX & Finishing",
          items: [
            {
              code: "52-01",
              description: "VFX / CGI Supervisor",
              amount: 1,
              unit: "Flat",
              rate: 6000,
            },
            {
              code: "52-03",
              description: "Compositing / Retouching",
              amount: 1,
              unit: "Flat",
              rate: 3000,
            },
            {
              code: "52-04",
              description: "Finishing / Deliverables",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
          ],
        },
      ],
    },
  ],
  { shootingDays: 2, genre: "Commercial" }
);
