import React from "react"
import { expect, test, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import App from "./App"
import { useSnowboards } from "./db/db"

const { boardForSeason } = vi.hoisted(() => ({
    boardForSeason: (season?: string) => ({
        brandname: "CAPiTA", season,
        name: season === "W2024_2025" ? "OLDER BOARD" : season === "W2025_2026" ? "PREVIOUS BOARD" : "CURRENT BOARD",
        riders: ["MEN"], sizes: ["150", "153W", "156"],
        imageUrl: "/board-150.png",
        imagesBySize: { "150": "/board-150.png", "153W": "/board-153W.png" },
        specs: { "150": { size: 150, wide: false }, "153W": { size: 153, wide: true } },
    }),
}))

vi.mock("./db/db", () => ({
    db: {
        brands: { toArray: async () => [{ name: "CAPiTA" }, { name: "GNU" }, { name: "Jones" }] },
        snowboards: {
            where: ({ season }: { season: string }) => ({
                filter: (predicate: (board: ReturnType<typeof boardForSeason>) => boolean) => ({
                    first: async () => {
                        const board = boardForSeason(season)
                        return predicate(board) ? board : undefined
                    },
                }),
            }),
            toArray: async () => [
            { brandname: "CAPiTA", season: "W2025_2026" },
            { brandname: "CAPiTA", season: "W2026_2027" },
            { brandname: "GNU", season: "W2024_2025" },
            { brandname: "Jones", season: "W2026_2027" },
        ] },
    },
    useSnowboards: vi.fn(({ season }: { season?: string }) => [boardForSeason(season)]),
    useSeasons: () => ["W2024_2025", "W2025_2026", "W2026_2027"],
}))

test("switches the displayed boards when selecting another season", () => {
    window.location.hash = "#/CAPiTA/W2026_2027"
    render(<App />)

    expect(screen.getByText("CURRENT BOARD")).toBeInTheDocument()
    expect(within(screen.getByRole("link", { name: "CURRENT BOARD" })).getByTitle("Season 26/27")).toHaveTextContent("26/27")
    expect(screen.getByRole("link", { name: "26/27" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "26/27" })).toHaveStyle({ textDecoration: "none" })
    fireEvent.click(screen.getByRole("link", { name: "25/26" }))

    expect(screen.getByText("PREVIOUS BOARD")).toBeInTheDocument()
    expect(within(screen.getByRole("link", { name: "PREVIOUS BOARD" })).getByTitle("Season 25/26")).toHaveTextContent("25/26")
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

    const board = screen.getByRole("link", { name: "CURRENT BOARD" })
    board.focus()
    fireEvent.click(board)
    expect(window.location.hash).toBe("#/capita/W2026_2027/current%20board")
    await screen.findByRole("dialog", { name: "CAPiTA CURRENT BOARD" })

    fireEvent.click(screen.getByRole("tab", { name: "Specifications" }))
    expect(screen.getByRole("columnheader", { name: "Effective edge (mm)" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(board).toHaveFocus())
})

test("navigates one document with tabs and follows scrolling", async () => {
    window.location.hash = "#/capita/W2026_2027/current%20board"
    render(<App />)
    const viewport = await screen.findByRole("region", { name: "Snowboard details" })
    expect(screen.getByRole("heading", { name: "CAPiTA CURRENT BOARD 26/27" })).toBeInTheDocument()
    expect(viewport).toHaveStyle({ flex: "1 1" })
    const sections = ["Snowboard", "Specifications"].map(name =>
        within(viewport).getByRole("region", { name }))
    vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => ({ top: 0 }) as DOMRect)
    sections.forEach((section, index) => {
        vi.spyOn(section, "getBoundingClientRect").mockImplementation(() =>
            ({ top: index * 500 - viewport.scrollTop }) as DOMRect)
    })

    fireEvent.click(screen.getByRole("tab", { name: "Specifications" }))
    expect(viewport.scrollTop).toBe(500)
    expect(screen.getByRole("tab", { name: "Specifications" })).toHaveAttribute("aria-selected", "true")
    expect(within(viewport).getByRole("img")).toBeInTheDocument()
    expect(within(viewport).getByRole("columnheader", { name: "Size" })).toHaveStyle({ position: "sticky" })
    expect(within(viewport).getByRole("rowheader", { name: "150" })).toHaveStyle({ position: "sticky" })
    const wideRow = within(viewport).getByRole("rowheader", { name: "153W" }).closest("tr")!
    fireEvent.click(within(wideRow).getAllByRole("cell")[0])
    expect(within(wideRow).getAllByRole("cell")[0]).toHaveStyle({ backgroundColor: "#f2f2f2" })
    expect(within(viewport).getByRole("img")).toHaveAttribute("src", "/board-153W.png")
    expect(within(viewport).getByRole("button", { name: "153W" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(within(viewport).getByRole("button", { name: "150" }))
    expect(within(viewport).queryByRole("checkbox")).not.toBeInTheDocument()
    const regularRow = within(viewport).getByRole("rowheader", { name: "150" }).closest("tr")!
    expect(within(regularRow).getAllByRole("cell")[0]).toHaveStyle({ backgroundColor: "#f2f2f2" })
    expect(within(wideRow).getAllByRole("cell")[0]).not.toHaveStyle({ backgroundColor: "#f2f2f2" })

    expect(screen.queryByRole("tab", { name: "Technologies" })).not.toBeInTheDocument()
    expect(within(viewport).queryByRole("region", { name: "Technologies" })).not.toBeInTheDocument()
    // A short final section can reach the bottom before its heading reaches the top.
    Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 400 },
        scrollHeight: { configurable: true, value: 700 },
    })
    viewport.scrollTop = 300
    fireEvent.scroll(viewport)
    expect(screen.getByRole("tab", { name: "Specifications" })).toHaveAttribute("aria-selected", "true")
    const tableScroll = within(viewport).getByRole("region", { name: "Specifications table" })
    tableScroll.scrollLeft = 200
    viewport.scrollTop = 0
    fireEvent.scroll(viewport)
    expect(tableScroll.scrollLeft).toBe(0)
    expect(screen.getByRole("tab", { name: "Snowboard" })).toHaveAttribute("aria-selected", "true")
})

test("marks brands with a 25/26 season while linking to their latest season", async () => {
    window.location.hash = "#/"
    render(<App />)

    const capita = await screen.findByRole("link", { name: "CAPiTA" })
    expect(capita).toHaveAttribute("href", "#/capita/W2026_2027")
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


test("opens a shared board URL over its season catalog and closes into that catalog", async () => {
    window.history.replaceState(null, "", "#/capita/W2025_2026/previous%20board")
    render(<App />)
    await screen.findByRole("dialog", { name: "CAPiTA PREVIOUS BOARD" })
    expect(screen.getByRole("link", { name: "25/26", hidden: true })).toHaveAttribute("aria-current", "page")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(window.location.hash).toBe("#/capita/W2025_2026"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
})

test("preserves the catalog filter and supports browser back and forward", async () => {
    window.history.replaceState(null, "", "#/CAPiTA/W2026_2027")
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "MEN" }))
    fireEvent.click(screen.getByRole("link", { name: "CURRENT BOARD" }))
    await screen.findByRole("dialog", { name: "CAPiTA CURRENT BOARD" })
    window.history.back()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "MEN" })).toHaveAttribute("aria-pressed", "true")
    window.history.forward()
    await screen.findByRole("dialog", { name: "CAPiTA CURRENT BOARD" })
})

test("opens the chosen card size and switches images, including after an image error", async () => {
    window.history.replaceState(null, "", "#/CAPiTA/W2026_2027")
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Open CURRENT BOARD, size 153W" }))
    const dialog = await screen.findByRole("dialog", { name: "CAPiTA CURRENT BOARD" })
    expect(await within(dialog).findByRole("img")).toHaveAttribute("src", "/board-153W.png")
    fireEvent.error(within(dialog).getByRole("img"))
    fireEvent.click(within(dialog).getByRole("button", { name: "150" }))
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/board-150.png")
    expect(within(dialog).getByRole("button", { name: "150" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(within(dialog).getByRole("button", { name: "156" }))
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument()
    expect(within(dialog).getByText("Image unavailable for this size")).toBeInTheDocument()
})

test("handles a missing board and allows closing the modal", async () => {
    window.history.replaceState(null, "", "#/capita/W2026_2027/missing")
    render(<App />)
    await screen.findByText("Snowboard not found")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(window.location.hash).toBe("#/capita/W2026_2027")
})


test("resolves lowercase catalog URLs to the original brand name", async () => {
    window.history.replaceState(null, "", "#/capita/W2026_2027")
    render(<App />)
    await screen.findByRole("heading", { name: "CAPiTA" })
    expect(screen.getByRole("link", { name: "CURRENT BOARD" })).toHaveAttribute("href", "#/capita/W2026_2027/current%20board")
    expect(useSnowboards).toHaveBeenCalledWith(
        { brandname: "CAPiTA", season: "W2026_2027" }, {}, expect.anything()
    )
})
