import React from "react"
import { expect, test, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import App from "./App"

vi.mock("./db/db", () => ({
    db: {},
    useSnowboards: ({ season }: { season?: string }) => [
        {
            brandname: "CAPiTA",
            season,
            name: season === "W2024_2025" ? "OLDER BOARD" : season === "W2025_2026" ? "PREVIOUS BOARD" : "CURRENT BOARD",
            riders: ["MEN"],
            sizes: ["150"],
            specs: { "150": { size: 150, wide: false } },
        },
    ],
    useSeasons: () => ["W2024_2025", "W2025_2026", "W2026_2027"],
}))

test("switches the displayed boards when selecting another season", () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    expect(screen.getByText("CURRENT BOARD")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "26/27" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "26/27" })).toHaveStyle({ textDecoration: "none" })
    fireEvent.click(screen.getByRole("link", { name: "25/26" }))

    expect(screen.getByText("PREVIOUS BOARD")).toBeInTheDocument()
    expect(screen.queryByText("CURRENT BOARD")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "25/26" })).toHaveAttribute("aria-current", "page")

    fireEvent.click(screen.getByRole("link", { name: "24/25" }))
    expect(screen.getByText("OLDER BOARD")).toBeInTheDocument()
    expect(screen.queryByText("PREVIOUS BOARD")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "24/25" })).toHaveAttribute("aria-current", "page")

    fireEvent.click(screen.getByRole("link", { name: "26/27" }))
    expect(screen.getByText("CURRENT BOARD")).toBeInTheDocument()
    expect(screen.queryByText("OLDER BOARD")).not.toBeInTheDocument()
})

test("opens specifications and returns focus to the board after closing", async () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    const board = screen.getByRole("button", { name: /CURRENT BOARD/ })
    board.focus()
    fireEvent.click(board)
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Specifications" }))
    expect(screen.getByRole("columnheader", { name: "Effective edge (mm)" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(board).toHaveFocus())
})
