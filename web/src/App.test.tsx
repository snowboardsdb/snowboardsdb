import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import App from "./App"

jest.mock("./db/db", () => ({
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
