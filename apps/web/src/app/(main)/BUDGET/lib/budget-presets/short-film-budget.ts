import { buildBudgetWithTotals } from "../budget-helpers";

import type { Budget } from "../types";

// =============================================================================
// قالب الفيلم القصير — 5 أيام تصوير، ميزانية ~$25,000
// =============================================================================
export const SHORT_FILM_BUDGET: Budget = buildBudgetWithTotals(
  "USD",
  [
    {
      id: "atl",
      name: "Above The Line",
      color: "#3B82F6",
      categories: [
        {
          code: "11-00",
          name: "Story & Rights",
          items: [
            {
              code: "11-01",
              description: "Script / Screenplay",
              amount: 1,
              unit: "Flat",
              rate: 1500,
            },
          ],
        },
        {
          code: "12-00",
          name: "Producers Unit",
          items: [
            {
              code: "12-01",
              description: "Producer",
              amount: 1,
              unit: "Flat",
              rate: 2500,
            },
          ],
        },
        {
          code: "13-00",
          name: "Director & Staff",
          items: [
            {
              code: "13-01",
              description: "Director",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
            {
              code: "13-04",
              description: "Storyboard Artist",
              amount: 2,
              unit: "Day",
              rate: 350,
            },
          ],
        },
        {
          code: "14-00",
          name: "Cast",
          items: [
            {
              code: "14-01",
              description: "Lead Cast",
              amount: 1,
              unit: "Flat",
              rate: 2000,
            },
            {
              code: "14-02",
              description: "Supporting Cast",
              amount: 2,
              unit: "Flat",
              rate: 750,
            },
            {
              code: "14-07",
              description: "Casting Director",
              amount: 1,
              unit: "Flat",
              rate: 800,
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
              amount: 7,
              unit: "Day",
              rate: 350,
            },
            {
              code: "20-03",
              description: "1st Assistant Director",
              amount: 5,
              unit: "Day",
              rate: 300,
            },
            {
              code: "20-06",
              description: "Script Supervisor",
              amount: 5,
              unit: "Day",
              rate: 200,
            },
            {
              code: "20-07",
              description: "Production Coordinator",
              amount: 7,
              unit: "Day",
              rate: 200,
            },
          ],
        },
        {
          code: "25-00",
          name: "Props & Art",
          items: [
            {
              code: "25-01",
              description: "Prop Master",
              amount: 5,
              unit: "Day",
              rate: 250,
            },
            {
              code: "25-03",
              description: "Props Purchase / Rental",
              amount: 1,
              unit: "Flat",
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
              amount: 5,
              unit: "Day",
              rate: 600,
            },
            {
              code: "30-03",
              description: "1st Asst Camera",
              amount: 5,
              unit: "Day",
              rate: 250,
            },
            {
              code: "30-08",
              description: "Camera Package Rental",
              amount: 5,
              unit: "Day",
              rate: 400,
            },
          ],
        },
        {
          code: "31-00",
          name: "Lighting / Grip",
          items: [
            {
              code: "31-01",
              description: "Gaffer",
              amount: 5,
              unit: "Day",
              rate: 350,
            },
            {
              code: "31-05",
              description: "Lighting Package Rental",
              amount: 5,
              unit: "Day",
              rate: 300,
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
              rate: 2500,
            },
            {
              code: "50-03",
              description: "Colorist",
              amount: 1,
              unit: "Flat",
              rate: 800,
            },
          ],
        },
        {
          code: "51-00",
          name: "Sound",
          items: [
            {
              code: "51-01",
              description: "Sound Mixer (on set)",
              amount: 5,
              unit: "Day",
              rate: 350,
            },
            {
              code: "51-02",
              description: "Sound Design & Mix",
              amount: 1,
              unit: "Flat",
              rate: 1200,
            },
            {
              code: "51-04",
              description: "Music Composer / License",
              amount: 1,
              unit: "Flat",
              rate: 600,
            },
          ],
        },
      ],
    },
  ],
  { shootingDays: 5, genre: "Short Film" }
);
