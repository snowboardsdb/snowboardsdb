import React from "react"
import { expect, test, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import App from "./App"
import { useSnowboards } from "./db/db"

vi.mock("./db/db", () => ({
    db: {
        brands: { toArray: async () => [{ name: "CAPiTA" }, { name: "GNU" }, { name: "Jones" }] },
        snowboards: { toArray: async () => [
            { brandname: "CAPiTA", season: "W2025_2026" },
            { brandname: "CAPiTA", season: "W2026_2027" },
            { brandname: "GNU", season: "W2024_2025" },
            { brandname: "Jones", season: "W2026_2027" },
        ] },
    },
    useSnowboards: vi.fn(({ season }: { season?: string }) => [
        {
            brandname: "CAPiTA",
            season,
            name: season === "W2024_2025" ? "OLDER BOARD" : season === "W2025_2026" ? "PREVIOUS BOARD" : "CURRENT BOARD",
            riders: ["MEN"],
            sizes: ["150"],
            specs: { "150": { size: 150, wide: false } },
        },
    ]),
    useSeasons: () => ["W2024_2025", "W2025_2026", "W2026_2027"],
}))

test("switches the displayed boards when selecting another season", () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    expect(screen.getByText("CURRENT BOARD")).toBeInTheDocument()
    expect(within(screen.getByRole("button", { name: "CURRENT BOARD" })).getByTitle("Season 26/27")).toHaveTextContent("26/27")
    expect(screen.getByRole("link", { name: "26/27" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "26/27" })).toHaveStyle({ textDecoration: "none" })
    fireEvent.click(screen.getByRole("link", { name: "25/26" }))

    expect(screen.getByText("PREVIOUS BOARD")).toBeInTheDocument()
    expect(within(screen.getByRole("button", { name: "PREVIOUS BOARD" })).getByTitle("Season 25/26")).toHaveTextContent("25/26")
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

test("marks brands with a 25/26 season while linking to their latest season", async () => {
    window.location.hash = "#/"
    render(<App />)

    const capita = await screen.findByRole("link", { name: "CAPiTA" })
    expect(capita).toHaveAttribute("href", "#/CAPiTA/W2026_2027")
    expect(within(capita.parentElement!.parentElement!).getByText("NEW")).toHaveAttribute("title", "25/26 season available")

    const gnu = screen.getByRole("link", { name: "GNU" })
    const jones = screen.getByRole("link", { name: "Jones" })
    expect(within(gnu.parentElement!.parentElement!).queryByText("NEW")).not.toBeInTheDocument()
    expect(within(jones.parentElement!.parentElement!).queryByText("NEW")).not.toBeInTheDocument()
})

test("toggles rider filters off and clears the query filter", () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    const men = screen.getByRole("button", { name: "MEN" })
    const women = screen.getByRole("button", { name: "WOMEN" })
    expect(men).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(men)
    expect(men).toHaveAttribute("aria-pressed", "true")
    expect(useSnowboards).toHaveBeenLastCalledWith(expect.anything(), { riders: ["MEN"] }, expect.anything())

    fireEvent.click(women)
    expect(men).toHaveAttribute("aria-pressed", "false")
    expect(women).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(women)
    expect(women).toHaveAttribute("aria-pressed", "false")
    expect(useSnowboards).toHaveBeenLastCalledWith(expect.anything(), { riders: undefined }, expect.anything())
})

test("returns to the brands page using the back button", async () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    fireEvent.click(screen.getByRole("button", { name: "Back to brands" }))
    expect(window.location.hash).toBe("#/")
    await waitFor(() => expect(screen.getByRole("link", { name: "Snowboards" })).toBeInTheDocument())
})
