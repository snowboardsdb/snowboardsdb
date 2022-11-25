export type Brand = {
    name: string
}

export enum Rider {
    MEN = "MEN",
    WOMEN = "WOMEN",
    YOUTH = "YOUTH",
}

export type Snowboard = {
    name: string
    brandname: string,
    season: Season,
    rider: Rider,
    sizes: string[],
    countur?: Countur,
    technology?: Technology[],
    specs: {
        [key: string]: Spec
    }
}

export type Spec = {
    size: number,
    wide: boolean,
    contactLength: number,
    sidecut: number,
    noseWidth: number,
    noseLength: number,
    tailWidth: number,
    waistWidth: number,
    stanceMin: number,
    stanceMax: number,
    stanceSetBack?: number,
    stanceSetBack_in?: number,
    flex: number,
    weightMin: number,
}

export enum Season {
    W2015_2016 = "W2015_2016",
    W2016_2017 = "W2016_2017",
    W2017_2018 = "W2017_2018",
    W2018_2019 = "W2018_2019",
    W2019_2020 = "W2019_2020",
    W2020_2021 = "W2020_2021",
    W2021_2022 = "W2021_2022",
    W2022_2023 = "W2022_2023",
}

enum MervinCountur {
    ORIGNAL_BANANA = "ORIGINAL_BANANA",
    C2 = "C2",
    C2_EASY = "C2_EASY",
    C2_XTREME = "C2_XTREME",
    C3_CAMBER = "C3_CAMBER",
}

export type Countur = MervinCountur

export type Technology = GnuTechnology | LibTechTechnology

enum GnuTechnology {
    G1_ECO_CONSTRUCTION = "G1_ECO_CONSTRUCTION",
    G2_ECO_CONSTRUCTION = "G2_ECO_CONSTRUCTION",
    G3_ECO_CONSTRUCTION = "G3_ECO_CONSTRUCTION",
}

enum LibTechTechnology {
    ORIGINAL_POWER = "ORIGINAL_POWER",
    HORSEPOWERPOWER = "HORSEPOWERPOWER",
    FIREPOWERPOWER = "FIREPOWERPOWER",
    SPLIT = "SPLIT",
    APEX = "APEX",

    MAGNE_TRACION = "MAGNE_TRACION",
}

export function isBrand(val?: string) {
    return ({ brandname, season }: Snowboard) => {
        return brandname === val
    }
}

export function isSeason(val?: Season) {
    return ({ season }: Snowboard) => {
        return season == val
    }
}

export function toSeasons(acc: Season[], { season }: { season: Season}) {
        if (!acc.includes(season)) {
            acc.push(season)
        }

        return acc
}

export function toBrands(snowboards: Snowboard[]): string[] {
    return snowboards.reduce((acc, { brandname }) => {
        if (!acc.includes(brandname)) {
            acc.push(brandname)
        }

        return acc
    }, [] as string[]).sort()
}

export function toLetterIndex(brands: string[]): string[] {
    return brands.reduceRight((acc, name ) => {
        if (!acc.includes(name[0].toUpperCase())) {
            acc.push(name[0].toUpperCase())
        }

        return acc
    }, [] as string[]).sort()
}