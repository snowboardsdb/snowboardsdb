import { afterEach, expect } from "vitest"
import { cleanup, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

afterEach(async () => {
    cleanup()
    // Grommet keeps an animated layer clone briefly after unmounting.
    await waitFor(() => expect(document.querySelector("#layerClone")).toBeNull())
})
