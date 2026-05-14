import { buildBudgetWithTotals } from "../budget-helpers";

import type { Budget } from "../types";

// =============================================================================
// قالب الفيلم الوثائقي — 15 يوم تصوير ميداني، ميزانية ~$75,000
// =============================================================================
export const DOCUMENTARY_BUDGET: Budget = buildBudgetWithTotals(
  "USD",
  [
    {
      id: "atl",
      name: "Above The Line",
      color: "#3B82F6",
      categories: [
        {
          code: "10-00",
          name: "Development & Research",
          items: [
            {
              code: "10-01",
              description: "Research & Development",
              amount: 1,
              unit: "Flat",
              rate: 4000,
            },
            {
              code: "10-03",
              description: "Location Scouting & Clearances",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
            {
              code: "10-05",
              description: "Legal / Rights Clearances",
              amount: 1,
              unit: "Flat",
              rate: 2500,
            },
          ],
        },
        {
          code: "12-00",
          name: "Producers Unit",
          items: [
            {
              code: "12-01",
              description: "Executive Producer",
              amount: 1,
              unit: "Flat",
              rate: 8000,
            },
          ],
        },
        {
          code: "13-00",
          name: "Director & Staff",
          items: [
            {
              code: "13-01",
              description: "Director / Writer",
              amount: 1,
              unit: "Flat",
              rate: 10000,
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
              code: "20-02",
              description: "Production Manager",
              amount: 20,
              unit: "Day",
              rate: 350,
            },
            {
              code: "20-10",
              description: "Production Assistants",
              amount: 15,
              unit: "Day",
              rate: 150,
            },
          ],
        },
        {
          code: "15-00",
          name: "Travel & Living",
          items: [
            {
              code: "15-01",
              description: "Airfares / Transport",
              amount: 1,
              unit: "Flat",
              rate: 3500,
            },
            {
              code: "15-03",
              description: "Hotel / Accommodation",
              amount: 15,
              unit: "Day",
              rate: 180,
            },
            {
              code: "15-04",
              description: "Per Diem",
              amount: 15,
              unit: "Day",
              rate: 80,
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
              amount: 15,
              unit: "Day",
              rate: 650,
            },
            {
              code: "30-03",
              description: "Camera Assistant",
              amount: 15,
              unit: "Day",
              rate: 300,
            },
            {
              code: "30-08",
              description: "Camera Package (ENG/Cinema)",
              amount: 15,
              unit: "Day",
              rate: 350,
            },
            {
              code: "30-09",
              description: "Drone / Aerial Unit",
              amount: 3,
              unit: "Day",
              rate: 600,
            },
          ],
        },
        {
          code: "31-00",
          name: "Sound",
          items: [
            {
              code: "31-01",
              description: "Sound Recordist (on set)",
              amount: 15,
              unit: "Day",
              rate: 400,
            },
            {
              code: "31-05",
              description: "Sound Equipment",
              amount: 15,
              unit: "Day",
              rate: 150,
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
              description: "Editor",
              amount: 1,
              unit: "Flat",
              rate: 8000,
            },
            {
              code: "50-03",
              description: "Colorist",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
            {
              code: "50-04",
              description: "Online / Finishing",
              amount: 1,
              unit: "Flat",
              rate: 1500,
            },
          ],
        },
        {
          code: "51-00",
          name: "Sound Post",
          items: [
            {
              code: "51-01",
              description: "Sound Design & Mix",
              amount: 1,
              unit: "Flat",
              rate: 3000,
            },
            {
              code: "51-02",
              description: "Narration / VO Record",
              amount: 1,
              unit: "Flat",
              rate: 1200,
            },
            {
              code: "51-04",
              description: "Music Composer / Licensing",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
          ],
        },
        {
          code: "52-00",
          name: "Archival & Graphics",
          items: [
            {
              code: "52-01",
              description: "Archival Licensing",
              amount: 1,
              unit: "Flat",
              rate: 3000,
            },
            {
              code: "52-02",
              description: "Motion Graphics / Titles",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
          ],
        },
      ],
    },
  ],
  { shootingDays: 15, genre: "Documentary" }
);
