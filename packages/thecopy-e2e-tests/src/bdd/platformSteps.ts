import { expect } from "chai";
import type { WebDriver } from "selenium-webdriver";

import { getEnvironment } from "../../config/index.js";
import { TheCopyExperience } from "../flows/TheCopyExperience.js";
import { PLATFORM_STUDIOS, type StudioPage } from "../pages/index.js";
import type { BddStep } from "./FeatureFile.js";

export interface PlatformBddWorld {
  driver: WebDriver;
  experience: TheCopyExperience;
  currentStudio: StudioPage | null;
}

export function createPlatformWorld(driver: WebDriver): PlatformBddWorld {
  return {
    driver,
    experience: new TheCopyExperience(driver),
    currentStudio: null,
  };
}

export const platformSteps: readonly BddStep<PlatformBddWorld>[] = [
  {
    pattern: /^the public frontend is reachable$/,
    async run(world) {
      const env = getEnvironment();
      expect(env.frontend.baseUrl).to.match(/^https?:\/\//);
      await world.experience.openHome();
    },
  },
  {
    pattern: /^a visitor opens the home page$/,
    async run(world) {
      await world.experience.openHome();
    },
  },
  {
    pattern: /^the page should expose Arabic product content and primary navigation$/,
    async run(world) {
      const html = await world.driver.executeScript(
        "return document.documentElement.innerHTML;"
      );
      expect(String(html), "Arabic page content").to.match(/[\u0600-\u06FF]/);
      expect(await world.experience.pageExposesUserNavigation()).to.equal(true);
    },
  },
  {
    pattern: /^a visitor opens the "([^"]+)" studio$/,
    async run(world, match) {
      const slug = match[1];
      const studio = PLATFORM_STUDIOS.find((entry) => entry.slug === slug);
      if (!studio) throw new Error(`Unknown studio in BDD feature: ${slug}`);
      world.currentStudio = await world.experience.openStudio(studio);
    },
  },
  {
    pattern: /^the studio should render a meaningful interactive surface$/,
    async run(world) {
      if (!world.currentStudio) throw new Error("No studio is open in the BDD world");
      const signal = await world.currentStudio.readContentSignal();
      expect(signal.hasMeaningfulContent, "meaningful studio content").to.equal(true);
      expect(
        signal.hasInteractive || signal.visibleTextLength > 100,
        "interactive surface or rich visible text"
      ).to.equal(true);
    },
  },
];
