import React, { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { HashRouter, Link, LinkProps, Routes, Route, useParams, useNavigate, useLocation, matchPath, Location} from "react-router-dom"

import { Anchor, AnchorProps, Box, BoxExtendedProps, Button, Grid, Grommet, Heading, Image, Layer, Main, Stack, Tab, Tabs, Text, ThemeContext } from "grommet"
import { Table, TableHeader, TableRow, TableCell, TableBody, TableProps, DataTable, ColumnConfig } from "grommet"
import { normalizeColor } from "grommet/es6/utils"
import { FormClose, LinkPrevious } from "grommet-icons"

import { SizeList } from "./SizeList"
import "./App.css"

import { useLiveQuery } from "dexie-react-hooks"
import { db as dexsnowboards, useSnowboards, useSeasons } from "./db/db"

import { Season, Brand as BrandType, Snowboard, Spec  } from "./db/model"

const mobileBoardQuery = "(max-width: 768px)"

function subscribeToMobileBoard(onChange: () => void) {
    const query = window.matchMedia?.(mobileBoardQuery)
    query?.addEventListener("change", onChange)
    return () => query?.removeEventListener("change", onChange)
}

function isMobileBoard() {
    return window.matchMedia?.(mobileBoardQuery).matches ?? false
}

const theme = {
    global: {
        font: {
            family: "Roboto",
            size: "18px",
            height: "20px",
        },
        focus: {
            outline: {
                size: "0"
            }
        }
    },
}

const imageBaseUrl = "https://storage.yandexcloud.net/snowboardsdb/images"

function snowboardImageUrl({ brandname, season, name, imageUrl }: Snowboard): string {
    if (imageUrl) return imageUrl

    const extension = brandname === "Roxy" && season === "W2022_2023" && name === "Poppy Package" ? "png" : "jpg"
    const filename = `${brandname}_${season}_${name}.${extension}`

    return `${imageBaseUrl}/${[brandname, season, name, filename].map(encodeURIComponent).join("/")}`
}

function App() {
    return (
        <HashRouter>
            <Grommet theme={theme}>
                <AppRoutes />
            </Grommet>
        </HashRouter>
    )
}

// The URL identifies the board; history state keeps the page underneath it.
type BoardLocationState = { backgroundLocation?: Location, selectedSize?: string }

function boardPath({ brandname, season, name }: Snowboard): string {
    return `/${[brandname.toLowerCase(), season, name.toLowerCase()].map(encodeURIComponent).join("/")}`
}

function AppRoutes() {
    const location = useLocation()
    const state = location.state as BoardLocationState | null
    const boardMatch = matchPath("/:brand/:season/:name", location.pathname)
    const catalogPath = boardMatch
        ? `/${encodeURIComponent(boardMatch.params.brand!)}/${encodeURIComponent(boardMatch.params.season!)}`
        : location.pathname

    return (
        <>
            <Routes location={boardMatch ? state?.backgroundLocation || catalogPath : location}>
                <Route path="/" element={<Brands />} />
                <Route path="/:brand/:season" element={<Brand />} />
            </Routes>
            <Routes>
                <Route path="/:brand/:season/:name" element={<BoardModal />} />
                <Route path="*" element={null} />
            </Routes>
        </>
    )
}

function BoardModal() {
    const { brand, season, name } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const mobile = useSyncExternalStore(subscribeToMobileBoard, isMobileBoard)
    const state = location.state as BoardLocationState | null
    const snowboard = useLiveQuery(() =>
        dexsnowboards.snowboards.where({ season })
            .filter(board => board.brandname.toLowerCase() === brand?.toLowerCase() && board.name.toLowerCase() === name?.toLowerCase()).first().then(board => board || null),
        [brand, season, name]
    )
    const close = () => {
        if (state?.backgroundLocation) navigate(-1)
        else navigate(`/${encodeURIComponent(brand!)}/${encodeURIComponent(season!)}`, { replace: true })
    }

    return (
        <Layer className={mobile ? "snowboard-modal snowboard-modal--mobile" : "snowboard-modal"}
            position={mobile ? "bottom" : "center"} full={mobile ? "horizontal" : false} responsive={false}
            role="dialog" aria-modal="true" aria-label={snowboard ? `${snowboard.brandname} ${snowboard.name}` : "Snowboard"}
            onEsc={close} onClickOutside={close}>
            {snowboard ?
                <SnowboardDetails key={boardPath(snowboard)} snowboard={snowboard} mobile={mobile}
                    initialSize={state?.selectedSize} onClickClose={close} /> :
                <Box pad="medium" gap="medium">
                    <Text>{snowboard === undefined ? "Loading snowboard…" : "Snowboard not found"}</Text>
                    <Button label="Close" onClick={close} />
                </Box>
            }
        </Layer>
    )
}

export default App

function Brands() {
    const [ brands, setBrands ] = useState<BrandType[]>([])

    const [ letters, setLetters ] = useState<string[]>([])

    const brandnames = useLiveQuery(() => dexsnowboards.brands.toArray())

    useEffect(() => {
        if (brandnames) {
            setBrands(brandnames)

            setLetters(brandnames.reduce((acc, { name }) => {
                if (name && !/^\d/.test(name) && !acc.includes(name[0].toUpperCase())) {
                    acc.push(name[0].toUpperCase())
                }

                return acc
            }, [] as string[]))
        }

    }, [ brandnames ])

    useEffect(() => {
        setLetters(brands.reduce((acc, { name }) => {
            if (name && !/^\d/.test(name) && !acc.includes(name[0].toUpperCase())) {
                acc.push(name[0].toUpperCase())
            }

            return acc
        }, [] as string[]))
    }, [ brands ])

    const brandSeasons = useLiveQuery(async () => {
        const snowboards = await dexsnowboards.snowboards.toArray()
        return snowboards.reduce((seasons, snowboard) => {
            const current = seasons[snowboard.brandname]
            seasons[snowboard.brandname] = {
                latest: current && current.latest > snowboard.season ? current.latest : snowboard.season,
                hasNewSeason: Boolean(current?.hasNewSeason || snowboard.season === Season.W2025_2026),
            }
            return seasons
        }, {} as Record<string, { latest: Season, hasNewSeason: boolean }>)
    })

    const renderBrand = ({ name, nameImage, logo }: BrandType) => {
        const label = nameImage ?
            <img src={nameImage.src} alt={name} style={{ height: `${nameImage.height}px`, width: "auto" }} /> :
            name

        return (
            <Box key={name} direction="row" align="center" gap="xsmall" height="28px">
                {logo &&
                    <img src={logo.src} alt="" style={{ height: `${logo.height}px`, width: "auto" }} />
                }
                <Stack anchor="top-right" interactiveChild="first">
                    {brandSeasons?.[name] ?
                        <AnchorLink to={`/${encodeURIComponent(name.toLowerCase())}/${brandSeasons[name].latest}`} size="large">{label}</AnchorLink> :
                        nameImage ? label : <Text size="large" color="dark-3">{label}</Text>
                    }
                    {brandSeasons?.[name]?.hasNewSeason &&
                        <TrapezoidBadge background="#e53935" title="25/26 season available">NEW</TrapezoidBadge>
                    }
                </Stack>
            </Box>
        )
    }

    return (
        <Main pad="medium" responsive={false}>
            <Box direction="row" height="xxsmall" margin={{ bottom: "24px" }} pad={{ horizontal: "large" }} responsive={false}>
                <Heading level={3} alignSelf="center" margin={{ vertical: "none" }} responsive={false}>
                    <AnchorLink to="/">Snowboards</AnchorLink>
                </Heading>
            </Box>

            <Grid gap="large" columns="medium">
                {letters?.map(letter => {
                    return (
                        <Grid key={letter} columns={["xxsmall", "medium"]}>
                            <Box width="xxsmall">
                                <Text weight="bold" size="large" color="dark-6">{letter}</Text>
                            </Box>
                            <Grid gap="small" alignContent="start">
                                {brands.filter(({ name }) => name[0].toUpperCase() === letter).map(renderBrand)}
                            </Grid>
                        </Grid>
                    )
                })}
                {brands.some(({ name }) => /^\d/.test(name)) &&
                    <Grid columns={["xxsmall", "medium"]}>
                        <Box width="xxsmall">
                            <Text weight="bold" size="large" color="dark-6">#</Text>
                        </Box>
                        <Grid gap="small" alignContent="start">
                            {brands.filter(({ name }) => /^\d/.test(name)).map(renderBrand)}
                        </Grid>
                    </Grid>
                }
            </Grid>
        </Main>
    )
}

function TrapezoidBadge({ background, color = "white", title, children, style }: {
    background: string,
    color?: string,
    title: string,
    children: React.ReactNode,
    style?: React.CSSProperties,
}) {
    const badgeTheme = useContext(ThemeContext)

    return (
        <Text
            as="sup"
            title={title}
            size="9px"
            weight={500}
            color={color}
            style={{
                display: "block",
                transform: "translate(calc(100% + 4px), -20%)",
                padding: "0 6px 0 5px",
                background: normalizeColor(background, badgeTheme),
                lineHeight: "14px",
                fontStyle: "italic",
                letterSpacing: "0.03em",
                clipPath: "polygon(16% 0, 100% 0, 84% 100%, 0 100%)",
                ...style,
            }}
        >{children}</Text>
    )
}

function Brand() {
    const { brand: brandParam, season } = useParams()
    const brands = useLiveQuery(() => dexsnowboards.brands.toArray())
    const brand = brands?.find(item => item.name.toLowerCase() === brandParam?.toLowerCase())?.name || brandParam
    const navigate = useNavigate()

    const query = useMemo(() => ({ brandname: brand, season }), [brand, season])

    const [ filter, setFilter ] = useState<{ riders?: string[], }>({})

    const snowboards = useSnowboards(query, filter, [ query, filter ])

    const seasons = useSeasons({ brandname: brand }, [ brand ])

    const location = useLocation()
    const openBoard = (snowboard: Snowboard, selectedSize?: string) => {
        navigate(boardPath(snowboard), { state: { backgroundLocation: location, selectedSize } })
    }

    return (
        <Main pad={{ vertical: "medium" }} responsive={false}>
            <Box direction="row" align="center" margin={{ bottom: "24px" }} pad={{ horizontal: "12px" }} gap="8px" responsive={false}>
                <Button
                    plain
                    icon={<LinkPrevious size="24px" />}
                    aria-label="Back to brands"
                    onClick={() => navigate("/")}
                    style={{
                        width: "48px",
                        height: "48px",
                        padding: 0,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                />
                <Heading level={3} margin="none" alignSelf="center" color="brand" responsive={false}>{brand}</Heading>
            </Box>

            <Box
                margin={{ bottom: "large" }}
                overflow={{ horizontal: "auto" }}
                role="region"
                aria-label="Seasons and riders"
                tabIndex={0}
                style={{ scrollbarWidth: "none" }}
            >
                <Box
                    direction="row"
                    align="center"
                    gap="small"
                    responsive={false}
                    flex={false}
                    pad={{ horizontal: "medium", vertical: "xxsmall" }}
                    style={{ width: "max-content", minWidth: "100%", maxWidth: "none" }}
                >
                    {seasons?.map(val => {
                        const selected = val === season

                        return (
                            <AnchorLink
                                to={`/${encodeURIComponent(brand!.toLowerCase())}/${val}`}
                                key={val}
                                aria-current={selected ? "page" : undefined}
                                style={{ textDecoration: "none", flexShrink: 0 }}
                                label={
                                    <Box background={selected ? "brand" : "light-2"} pad={{ vertical: "xsmall", horizontal: "medium" }} round={{ size: "medium" }} responsive={false}>
                                        <Text size="small" weight="bold">{seasonName(val)}</Text>
                                    </Box>
                                }
                            />
                        )
                    })}
                    <Riders
                        value={filter.riders?.[0]}
                        onChangeRiders={rider => setFilter({ ...filter, riders: rider ? [rider] : undefined })}
                    />
                </Box>
            </Box>

            <Grid gap={{ row: "large", column: "medium" }} columns="small" margin={{ horizontal: "medium" }}>
                {snowboards && snowboards.map(
                    (snowboard, i) => {
                        const { brandname, season, name, sizes } = snowboard

                        return (
                            <Box
                                key={`${i}-${brandname}-${season}-${name}`}
                                gap="small"
                                style={{ minWidth: 0 }}
                            >
                                <AnchorLink to={boardPath(snowboard)} state={{ backgroundLocation: location }}
                                    aria-label={name} style={{ textDecoration: "none", color: "inherit" }}>
                                    <Box gap="small">
                                        <Stack anchor="top-right" interactiveChild="first" style={{ alignSelf: "center", maxWidth: "100%" }}>
                                            <Box width="small" height="small">
                                                <Image
                                                    fit="contain"
                                                    src={snowboardImageUrl(snowboard)}
                                                    fallback="/snowboards/blank.png"
                                                />
                                            </Box>
                                            <TrapezoidBadge
                                                background="light-3"
                                                color="dark-2"
                                                title={`Season ${seasonName(season)}`}
                                                style={{ transform: "none", fontStyle: "normal", padding: "0 6px 0 7px" }}
                                            >
                                                {seasonName(season)}
                                            </TrapezoidBadge>
                                        </Stack>
                                        <Box style={{ textAlign: "center" }}><Text>{name}</Text></Box>
                                    </Box>
                                </AnchorLink>
                                <SizeList sizes={sizes} name={name} onSelectSize={size => openBoard(snowboard, size)} />
                            </Box>
                        )
                    }
                )}
            </Grid>
        </Main>
    )
}

function SnowboardDetails({
    snowboard,
    mobile,
    onClickClose,
    initialSize,
}: {
    snowboard: Snowboard,
    mobile: boolean,
    initialSize?: string,
    onClickClose?: () => void,
}) {
    const { brandname, name, season, specs, sizes, imagesBySize } = snowboard
    const [selectedSize, setSelectedSize] = useState(
        initialSize && sizes.includes(initialSize) ? initialSize : sizes.find(size => imagesBySize?.[size]) || sizes[0]
    )
    const [activeSection, setActiveSection] = useState(0)
    const documentRef = useRef<HTMLDivElement>(null)
    const tableScrollRef = useRef<HTMLDivElement>(null)
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
    const technologies = snowboard.technology || []
    const sectionTitles = ["Snowboard", "Specifications", ...(technologies.length ? ["Technologies"] : [])]
    const navigateToSection = (index: number) => {
        const viewport = documentRef.current
        const section = sectionRefs.current[index]
        if (!viewport || !section) return
        viewport.scrollTop += section.getBoundingClientRect().top - viewport.getBoundingClientRect().top
        setActiveSection(index)
    }
    const updateActiveSection = () => {
        const viewport = documentRef.current
        if (!viewport) return
        if (viewport.scrollTop <= 1 && tableScrollRef.current) tableScrollRef.current.scrollLeft = 0
        if (mobile) return
        const top = viewport.getBoundingClientRect().top
        let index = 0
        sectionRefs.current.forEach((section, sectionIndex) => {
            if (section && section.getBoundingClientRect().top <= top + 40) index = sectionIndex
        })
        if (viewport.scrollTop > 0 && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) {
            index = sectionTitles.length - 1
        }
        setActiveSection(index)
    }
    const selectedImageUrl = imagesBySize ? imagesBySize[selectedSize] : snowboardImageUrl(snowboard)
    const sizePicker = sizes.length > 0 && (mobile || imagesBySize) && (
        <Box className="snowboard-modal-sizes" margin={{ top: "medium" }} overflow={{ horizontal: "auto" }}
            role="region" aria-label={`Sizes for ${name}`} tabIndex={0}
            style={{ scrollbarWidth: "none", overscrollBehaviorX: "contain" }}>
            <Box className="snowboard-modal-sizes-content" direction="row" gap={mobile ? undefined : "small"} justify="center" flex={false} responsive={false}
                pad={{ vertical: "xxsmall" }}
                style={{ width: "max-content", minWidth: "100%", maxWidth: "none" }}>
                {sizes.map(size =>
                    <Button key={size} plain aria-pressed={size === selectedSize}
                        style={{ flexShrink: 0 }}
                        onClick={() => setSelectedSize(size)}>
                        {({ hover, focus }) => (
                            <Box className="snowboard-modal-size"
                                background={size === selectedSize ? "brand" : hover || focus ? "light-4" : "light-2"}
                                pad={{ vertical: "xsmall", horizontal: "medium" }}
                                round={{ size: "medium" }}
                                responsive={false}
                            >
                                <Text size="small" weight="bold">{size}</Text>
                            </Box>
                        )}
                    </Button>
                )}
            </Box>
        </Box>
    )

    return (
        <Box className="snowboard-modal-details" pad={{ vertical: "medium" }} gap={mobile ? undefined : "small"} width="xlarge" flex={false}
            style={{ height: "100%", maxWidth: "100%", maxHeight: "100%", overflow: "hidden" }}>
            <Box className="snowboard-modal-header" direction="row" justify="between" align="start" flex={false} pad={{ horizontal: "medium" }}>
                {!mobile && <Heading level={3} margin="none" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <span>{brandname} {name}</span>
                    <TrapezoidBadge background="light-3" color="dark-2" title={`Season ${seasonName(season)}`}
                        style={{ transform: "translateY(-4px)", alignSelf: "flex-start", fontStyle: "normal", fontSize: "12px", lineHeight: "20px", padding: "0 10px", flexShrink: 0 }}>
                        {seasonName(season)}
                    </TrapezoidBadge>
                </Heading>}
                <Button className="snowboard-modal-close" icon={<FormClose aria-hidden="true" />} aria-label="Close" onClick={onClickClose} />
            </Box>
            {!mobile && <ThemeContext.Extend value={{ tab: { margin: "none", pad: { vertical: "xsmall" } }, tabs: { gap: "medium" } }}>
                <Tabs alignControls="start" justify="start" flex={false} margin={{ horizontal: "medium" }}
                    activeIndex={activeSection} onActive={navigateToSection}>
                    {sectionTitles.map(title => <Tab key={title} title={title} />)}
                </Tabs>
            </ThemeContext.Extend>}
            <Box ref={documentRef} className="snowboard-modal-document" flex
                overflow={{ vertical: "auto" }} pad={{ horizontal: "medium" }}
                onScroll={updateActiveSection} role="region" aria-label="Snowboard details" tabIndex={0}>
                    <Box as="section" className="snowboard-modal-overview" ref={element => { sectionRefs.current[0] = element }} flex={false}
                        aria-label="Snowboard" pad={{ bottom: "large" }}>
                        <Box className="snowboard-modal-hero" flex={false} align="center" justify="center">
                            {selectedImageUrl ?
                                <Image className="snowboard-modal-image" key={selectedImageUrl} fit="contain" src={selectedImageUrl}
                                    alt={`${brandname} ${name}${selectedSize ? `, ${selectedSize}` : ""}`} fallback="/snowboards/blank.png" /> :
                                <Text textAlign="center">Image unavailable for this size</Text>
                            }
                        </Box>
                        {mobile ? (
                            <div className="snowboard-modal-identity">
                                <Heading className="snowboard-modal-title" level={3} margin="none">{brandname} {name}</Heading>
                                <dl className="snowboard-modal-season">
                                    <dt>Season</dt>
                                    <dd>{season.replace(/^W(\d{4})_(\d{4})$/, "$1–$2")}</dd>
                                </dl>
                                {sizePicker && (
                                    <div className="snowboard-modal-size-picker">
                                        <div className="snowboard-modal-size-label">Sizes</div>
                                        {sizePicker}
                                    </div>
                                )}
                            </div>
                        ) : sizePicker}
                    </Box>
                    <Box as="section" className="snowboard-modal-section" ref={element => { sectionRefs.current[1] = element }} flex={false}
                        aria-label="Specifications" pad={{ bottom: technologies.length ? "large" : "none" }}>
                        <Heading className="snowboard-modal-section-title" level={4} margin={{ top: "none", bottom: "medium" }}>Specifications</Heading>
                        <Box className="snowboard-modal-table" ref={tableScrollRef} overflow={{ horizontal: "auto" }} flex={false}
                            role="region" aria-label="Specifications table" tabIndex={mobile ? 0 : undefined}>
                            <SpecsTable specs={specs} capita={brandname === "CAPiTA"}
                                selectedSize={selectedSize} onSelectSize={setSelectedSize} />
                        </Box>
                    </Box>
                    {technologies.length > 0 && <Box as="section" className="snowboard-modal-section" ref={element => { sectionRefs.current[2] = element }} flex={false}
                        aria-label="Technologies">
                        <Heading className="snowboard-modal-section-title" level={4} margin={{ top: "none", bottom: "medium" }}>Technologies</Heading>
                        {technologies.map(technology => <Text key={technology} margin={{ bottom: "small" }}>{technology.replace(/_/g, " ")}</Text>)}
                    </Box>}
            </Box>
        </Box>
    )
}

type SpecRow = Spec & { sizeLabel: string, sizeKey: string }

function SpecsTable({ specs, capita, selectedSize, onSelectSize }: {
    specs: Record<string, Spec>, capita: boolean, selectedSize: string, onSelectSize: (size: string) => void,
}) {
    const columns: ColumnConfig<SpecRow>[] = [
        { property: "sizeLabel", header: "Size", primary: true, pin: true,
            render: row => <Text weight="bold" data-selected={row.sizeKey === selectedSize}>{row.sizeLabel}</Text> },
        ...(capita ? [
            { property: "effectiveEdge", header: "Effective edge (mm)" },
            { property: "sidecut", header: "Sidecut (m)" },
            { property: "noseWidth", header: "Nose (cm)" },
            { property: "tailWidth", header: "Tail (cm)" },
            { property: "waistWidth", header: "Waist (cm)" },
            { property: "taper", header: "Taper (mm)" },
            { property: "referenceStance", header: "Ref. stance (cm)" },
            { property: "weightMin", header: "Rider weight (kg)", render: (row: SpecRow) => `${row.weightMin ?? ""}–${row.weightMax ?? ""}` },
            { property: "bootSize", header: "Boot size" },
        ] : [
            { property: "contactLength", header: "Contact Length" },
            { property: "sidecut", header: "Side Cut" },
            { property: "noseWidth", header: "Nose Width", render: (row: SpecRow) => row.noseWidth?.toLocaleString() },
            { property: "tailWidth", header: "Tail Width" },
            { property: "waistWidth", header: "Waist Width" },
            { property: "stanceMin", header: "Stance", render: (row: SpecRow) => `${row.stanceMin ?? ""}–${row.stanceMax ?? ""}` },
            { property: "stanceSetBack", header: "Set Back", render: (row: SpecRow) => setBack(row) },
            { property: "flex", header: "Flex" },
            { property: "weightMin", header: "Riders Weight", render: (row: SpecRow) => `${row.weightMin ?? ""}+ kg` },
        ]).map(column => ({ ...column, align: "end" as const })),
    ]
    const entries = Object.entries(specs)
    if (!capita) entries.sort(([left], [right]) => left.localeCompare(right))
    const data = entries.map(([key, spec]) => ({ ...spec, sizeKey: key, sizeLabel: capita ? key : `${spec.size}${spec.wide ? "W" : ""}` }))
    const selectedRow = data.find(row => row.sizeKey === selectedSize)

    return (
        <DataTable className="snowboard-specs" columns={columns}
            data={data}
            rowProps={selectedRow ? { [selectedRow.sizeLabel]: { background: "light-2" } } : undefined}
            onClickRow={({ datum }) => onSelectSize(datum.sizeKey)}
            primaryKey="sizeLabel" sortable={false} background={{ pinned: "white" }} />
    )
}

function JonesSpecsTable({
    specs,
    ...tableProps
}: {
    specs: {[key: string]: Spec}
} & TableProps) {
    return (
        <Table {...tableProps}>
            <TableHeader>
                <TableRow>
                    <TableCell scope="col" size="xxsmall" style={{position:"sticky"}}>Size</TableCell>
                    <TableCell scope="col" align="center">Contact Length</TableCell>
                    <TableCell scope="col" align="center">Side Cut</TableCell>
                    <TableCell scope="col" align="center">Nose Width</TableCell>
                    <TableCell scope="col" align="center">Tail Width</TableCell>
                    <TableCell scope="col" align="center">Waist Width</TableCell>
                    <TableCell scope="col" align="center">Stance</TableCell>
                    <TableCell scope="col" align="center">Set Back</TableCell>
                    <TableCell scope="col" align="center">Flex</TableCell>
                    <TableCell scope="col" align="center">Riders Weight</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.keys(specs).sort().map(key => {
                    const {
                        size, wide, contactLength, sidecut,
                        noseWidth, tailWidth, waistWidth,
                        stanceMin, stanceMax, stanceSetBack, stanceSetBack_in,
                        flex, weightMin,
                    } = specs[key]

                    return (
                        <TableRow key={key}>
                            <TableCell style={{position:"sticky"}}><Text weight="bold">{size}{wide && "W"}</Text></TableCell>
                            <TableCell align="right">{contactLength}</TableCell>
                            <TableCell align="right">{sidecut}</TableCell>
                            <TableCell align="right">{noseWidth?.toLocaleString()}</TableCell>
                            <TableCell align="right">{tailWidth}</TableCell>
                            <TableCell align="right">{waistWidth}</TableCell>
                            <TableCell align="right">{stanceMin}&ndash;{stanceMax}</TableCell>
                            <TableCell align="right">
                                {setBack({ stanceSetBack, stanceSetBack_in })}
                            </TableCell>
                            <TableCell align="right">{flex}</TableCell>
                            <TableCell align="right">{weightMin}+ kg</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

function Riders({
    value,
    onChangeRiders,
    ...props
}: {
    value?: string,
    onChangeRiders?: (value: string | undefined) => void,
} & BoxExtendedProps) {
    return (
        <Box {...props} direction="row" gap="small" flex={false} responsive={false} role="group" aria-label="Riders">
            {["MEN", "WOMEN", "YOUTH"].map(option => (
                <Button
                    key={option}
                    plain
                    aria-pressed={value === option}
                    onClick={() => onChangeRiders?.(value === option ? undefined : option)}
                >
                    {({ hover, focus }) => (
                        <Box
                            background={value === option ? "brand" : hover || focus ? "light-4" : "light-2"}
                            pad={{ vertical: "xsmall", horizontal: "medium" }}
                            round={{ size: "medium" }}
                            responsive={false}
                        >
                            <Text size="small" weight="bold">{option}</Text>
                        </Box>
                    )}
                </Button>
            ))}
        </Box>
    )
}

function setBack({ stanceSetBack, stanceSetBack_in }: { stanceSetBack?: number, stanceSetBack_in?: number }): string {
    if (!stanceSetBack && !stanceSetBack_in) {
        return "0"
    }

    const setback = []

    if (stanceSetBack) {
        setback.push(`${stanceSetBack}cm`)
    }

    if (stanceSetBack_in) {
        setback.push(`${stanceSetBack_in}″`)
    }

    return setback.join(" / ")
}

function seasonName(season: Season): string {
    return season.replace(/W\d\d(\d\d)_\d\d(\d\d)/, '$1/$2')
}

export type AnchorLinkProps = LinkProps &
  AnchorProps &
  Omit<JSX.IntrinsicElements['a'], 'color'>

const RouterAnchor = React.forwardRef<HTMLAnchorElement, LinkProps & {
    colorProp?: unknown, hasIcon?: boolean, hasLabel?: boolean, focus?: boolean,
}>(({ colorProp, hasIcon, hasLabel, focus, ...rest }, ref) => <Link ref={ref} {...rest} />)

const AnchorLink: React.FC<AnchorLinkProps> = (props) => {
    return (
        <Anchor
            as={RouterAnchor}
            {...props}
        />
    )
}
