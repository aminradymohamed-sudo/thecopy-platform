import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PERSPECTIVE_PARAMS,
  DEFAULT_PROMPT_BUILDER_PARAMS,
  DEFAULT_RHYTHM_PARAMS,
  DEFAULT_SPATIAL_PARAMS,
} from "../lib/types";

import { ModeSpecificControls } from "./ModeSpecificControls";

function Harness({ onAutoDeduce }: { onAutoDeduce: () => void }) {
  const [spatialParams, setSpatialParams] = useState(DEFAULT_SPATIAL_PARAMS);
  const [promptBuilderParams, setPromptBuilderParams] = useState(
    DEFAULT_PROMPT_BUILDER_PARAMS
  );
  const [rhythmParams, setRhythmParams] = useState(DEFAULT_RHYTHM_PARAMS);
  const [perspectiveParams, setPerspectiveParams] = useState(
    DEFAULT_PERSPECTIVE_PARAMS
  );

  return (
    <ModeSpecificControls
      mode="space"
      script="INT. ROOM - NIGHT"
      spatialParams={spatialParams}
      setSpatialParams={setSpatialParams}
      promptBuilderParams={promptBuilderParams}
      setPromptBuilderParams={setPromptBuilderParams}
      rhythmParams={rhythmParams}
      setRhythmParams={setRhythmParams}
      perspectiveParams={perspectiveParams}
      setPerspectiveParams={setPerspectiveParams}
      onAutoDeduceSpatial={onAutoDeduce}
      isDeducingSpatial={false}
    />
  );
}

describe("ModeSpecificControls", () => {
  it("renders spatial controls and keeps them interactive", () => {
    const onAutoDeduce = vi.fn();
    render(<Harness onAutoDeduce={onAutoDeduce} />);

    const colorsInput = screen.getByPlaceholderText("الألوان");
    fireEvent.change(colorsInput, { target: { value: "neon blue" } });

    expect(colorsInput).toHaveValue("neon blue");

    fireEvent.click(screen.getByRole("button", { name: /استنتاج تلقائي/ }));

    expect(onAutoDeduce).toHaveBeenCalledTimes(1);
  });
});
