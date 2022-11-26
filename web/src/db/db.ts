import Dexie, { Table } from "dexie"
import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"

import { Brand, Season, Snowboard, toSeasons } from "./model"


export class Snowboards extends Dexie {

    snowboards!: Table<Snowboard, number>

    brands!: Table<Brand, number>

    constructor() {
        super("Snowboards")

        this.version(6).stores({
            snowboards: '++id, brandname, season, [brandname+season], [brandname+season+riders]',
            brands: '++id, name'
        })
    }
}

export const db = new Snowboards()

db.on("ready", async function(db) {
    const inst = db as Snowboards

    inst.snowboards.clear()
    inst.brands.clear()

    const snowboards = await fetchSnowboards("/db/snowboards.json")

    inst.snowboards.bulkAdd(snowboards)

    const brands = await fetchSnowboards("/db/brands.json")

    inst.brands.bulkAdd(brands)
})

db.open()

export async function populate() {
    const snowboards = await fetchSnowboards("/db/snowboards.json")

    db.snowboards.bulkAdd(snowboards)

    const brands = await fetchSnowboards("/db/brands.json")

    db.brands.bulkAdd(brands)
}

async function fetchSnowboards(url: string): Promise<Snowboard[]> {
    const response = await fetch(url)

    return await response.json()
}

async function fetchBrands(url: string): Promise<Brand[]> {
    const response = await fetch(url)

    return await response.json()
}

export function useSnowboards(filter: { brandname?: string, season?: string, name?: string, riders?: string }, deps?: any[]) {
    const [ snowboards, setSnowboards ] = useState<Snowboard[]>([])

    const list = useLiveQuery(() => db.snowboards.where(filter).toArray(), deps)

    useEffect(() => {
        if (list) {
            setSnowboards(list)
        }
    }, [ list ])

    return snowboards
}

export function useSeasons({ brandname }: { brandname?: string }, deps?: any[]) {
    const [ seasons, setSeasons ] = useState<Season[]>([])

    const list = useSnowboards({ brandname }, deps)

    useEffect(() => {
        if (list) {
            setSeasons(list.reduce(toSeasons, []))
        }
    }, [ list ])

    return seasons
}