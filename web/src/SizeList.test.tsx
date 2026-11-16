import React from "react"
import { expect, test } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { Grommet } from "grommet"
import { SizeList } from "./SizeList"

test("fades only the edges with hidden sizes and updates after content changes", () => {
    const sizes = ["138", "140", "142", "144", "146", "148", "150W"]
    const { rerender } = render(<Grommet><SizeList sizes={sizes} name="Board" /></Grommet>)
    const viewport = screen.getByRole("region", { name: "Sizes for Board" })
    Object.defineProperties(viewport, {
        clientWidth: { configurable: true, value: 180 },
        scrollWidth: { configurable: true, value: 300 },
        scrollLeft: { configurable: true, writable: true, value: 0 },
    })

    fireEvent.scroll(viewport)
    expect(viewport).toHaveAttribute("data-overflow-start", "false")
    expect(viewport).toHaveAttribute("data-overflow-end", "true")
    expect(viewport).toHaveAttribute("tabindex", "0")

    viewport.scrollLeft = 50
    fireEvent.scroll(viewport)
    expect(viewport).toHaveAttribute("data-overflow-start", "true")
    expect(viewport).toHaveAttribute("data-overflow-end", "true")

    viewport.scrollLeft = 120
    fireEvent.scroll(viewport)
    expect(viewport).toHaveAttribute("data-overflow-start", "true")
    expect(viewport).toHaveAttribute("data-overflow-end", "false")

    Object.defineProperty(viewport, "scrollWidth", { value: 180 })
    viewport.scrollLeft = 0
    rerender(<Grommet><SizeList sizes={["150"]} name="Board" /></Grommet>)
    expect(viewport).toHaveAttribute("data-overflow-start", "false")
    expect(viewport).toHaveAttribute("data-overflow-end", "false")
    expect(viewport).not.toHaveAttribute("tabindex")
})
