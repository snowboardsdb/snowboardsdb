import Dexie, { Table } from "dexie"
import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"

import { Brand, Season, Snowboard, toSeasons } from "./model"


export class Snowboards extends Dexie {

    snowboards!: Table<Snowboard, number>

    brands!: Table<Brand, number>

    constructor() {
        super("Snowboards")

        this.version(9).stores({
            snowboards: '++id, brandname, season, [brandname+season]',
            brands: '++id, name'
        })
    }
}

export const db = new Snowboards()

db.on("ready", async function(db) {
    const inst = db as Snowboards

    inst.snowboards.clear()
    inst.brands.clear()

    inst.brands.bulkAdd(await (await fetch("/snowboards/brands.json")).json())

    inst.snowboards.bulkAdd(await (await fetch("/snowboards/gnu_23.json")).json())
    inst.snowboards.bulkAdd(await (await fetch("/snowboards/jones_23.json")).json())
    inst.snowboards.bulkAdd(await (await fetch("/snowboards/lib-tech_23.json")).json())
    inst.snowboards.bulkAdd(await (await fetch("/snowboards/roxy_23.json")).json())
    inst.snowboards.bulkAdd(await (await fetch("/snowboards/capita_27.json")).json())
})

db.open()

async function fetchSnowboards(url: string): Promise<Snowboard[]> {
    const response = await fetch(url)

    return await response.json()
}

async function fetchBrands(url: string): Promise<Brand[]> {
    const response = await fetch(url)

    return await response.json()
}

export function useSnowboards(
    query: { brandname?: string, season?: string, name?: string },
    filter: { riders?: string[] },
    deps?: any[]
) {
    const [ snowboards, setSnowboards ] = useState<Snowboard[]>([])

    const f = (val: Snowboard) => {
        if (!val || !val.riders) {
            return true
        }

        if (filter.riders) {
            return val.riders.some(x => filter.riders?.includes(x))
        }

        return true
    }

    const list = useLiveQuery(() => db.snowboards.where(query).and(f).sortBy("name"), deps)

    useEffect(() => {
        if (list) {
            setSnowboards(list)
        }
    }, [ list ])

    return snowboards
}

export function useSeasons({ brandname }: { brandname?: string }, deps?: any[]) {
    const [ seasons, setSeasons ] = useState<Season[]>([])

    const list = useSnowboards({ brandname }, {}, deps)

    useEffect(() => {
        if (list) {
            setSeasons(list.reduce(toSeasons, []))
        }
    }, [ list ])

    return seasons
}
