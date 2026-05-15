/**
 * مولّد بيانات اختبار معزولة لبيئة الـ Staging
 * يطابق مخطط auth.controller.ts: firstName + lastName + email + password
 */

import { faker } from "@faker-js/faker";

export interface SyntheticUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  marker: string;
}

export interface SyntheticProject {
  title: string;
  description: string;
  marker: string;
}

const E2E_PREFIX = "e2e-thecopy";

export function uniqueMarker(): string {
  return `${E2E_PREFIX}-${Date.now()}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

export function generateUser(): SyntheticUser {
  const marker = uniqueMarker();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    email: `${marker}@thecopy-e2e.invalid`,
    password: `Aa1!${faker.internet.password({ length: 14, memorable: false })}`,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName} | ${marker}`,
    marker,
  };
}

export function generateProject(): SyntheticProject {
  const marker = uniqueMarker();
  return {
    title: `E2E Project ${marker}`,
    description: faker.lorem.sentences({ min: 1, max: 2 }),
    marker,
  };
}
