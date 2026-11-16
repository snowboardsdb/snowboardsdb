import React, { useContext, useEffect, useMemo, useState } from "react"
import { HashRouter, Link, LinkProps, Routes, Route, useParams, useNavigate} from "react-router-dom"

import { Anchor, AnchorProps, Box, BoxExtendedProps, Button, Grid, Grommet, Heading, Image, Layer, LayerExtendedProps, Main, Stack, Tab, Tabs, Text, ThemeContext } from "grommet"
import { Table, TableHeader, TableRow, TableCell, TableBody, TableProps } from "grommet"
import { normalizeColor } from "grommet/es6/utils"
import { FormClose, LinkPrevious } from "grommet-icons"

import { SizeList } from "./SizeList"

import { useLiveQuery } from "dexie-react-hooks"
import { db as dexsnowboards, useSnowboards, useSeasons } from "./db/db"

import { Season, Brand as BrandType, Snowboard, Spec  } from "./db/model"

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
                <Routes>
                    <Route path="/">
                        <Route index element={<Brands/>}/>
                    </Route>
                    <Route path="/:brand/:season">
                        <Route index element={<Brand/>}/>
                    </Route>
                </Routes>
            </Grommet>
        </HashRouter>
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
                        <AnchorLink to={`/${name}/${brandSeasons[name].latest}`} size="large">{label}</AnchorLink> :
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
    const { brand, season } = useParams()
    const navigate = useNavigate()

    const query = useMemo(() => ({ brandname: brand, season }), [brand, season])

    const [ filter, setFilter ] = useState<{ riders?: string[], }>({})

    const snowboards = useSnowboards(query, filter, [ query, filter ])

    const seasons = useSeasons({ brandname: brand }, [ brand ])

    const [ pickedSnowboard, setPickedSnowboard ] = useState<Snowboard | undefined>()

    useEffect(() => {
        setPickedSnowboard(undefined)
    }, [brand, season])

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
                                to={`/${brand}/${val}`}
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
                                role="button"
                                aria-label={name}
                                style={{ minWidth: 0 }}
                                onClick={() => setPickedSnowboard(snowboard)}
                            >
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
                                <SizeList sizes={sizes} name={name} />
                            </Box>
                        )
                    }
                )}
            </Grid>

            {pickedSnowboard && pickedSnowboard.specs &&
                <SnowboardLayer
                    key={`${pickedSnowboard.brandname}-${pickedSnowboard.season}-${pickedSnowboard.name}`}
                    snowboard={pickedSnowboard}
                    onClickOutside={() => setPickedSnowboard(undefined)}
                    onEsc={() => setPickedSnowboard(undefined)}
                    onClickClose={() => setPickedSnowboard(undefined)}
                />
            }
        </Main>
    )
}

function SnowboardLayer({
    snowboard,
    onClickClose,
    ...layerProps
}: {
    snowboard: Snowboard,
    onClickClose?: () => void,
} & LayerExtendedProps) {
    const { brandname, name, season, specs, sizes, imagesBySize } = snowboard
    const [selectedSize, setSelectedSize] = useState(
        sizes.find(size => imagesBySize?.[size]) || sizes[0]
    )
    const selectedImageUrl = imagesBySize ? imagesBySize[selectedSize] : snowboardImageUrl(snowboard)

    return (
        <Layer {...layerProps} role="dialog" aria-modal="true" aria-label={`${brandname} ${name}`}>
            <Box pad="medium" gap="medium" fill>
                <Box direction="row" justify="between">
                    <Heading level={3} margin="none">{brandname} {name} {season.replace(/W\d{4}_(\d{4})/, "$1")}</Heading>
                    <Button icon={ <FormClose/> } aria-label="Close" onClick={onClickClose}/>
                </Box>
                <Tabs alignControls="start" justify="center">
                    <Tab title="Snowboard">
                        <Box margin={{ top: "medium" }}>
                            {imagesBySize &&
                                <Box direction="row" wrap gap="xsmall" justify="center" margin={{ bottom: "medium" }}>
                                    {sizes.map(size =>
                                        <Button key={size} label={size} primary={size === selectedSize}
                                            onClick={() => setSelectedSize(size)}/>
                                    )}
                                </Box>
                            }
                            {selectedImageUrl ?
                                <Image fit="contain" src={selectedImageUrl} fallback="/snowboards/blank.png"/> :
                                <Text textAlign="center">Image unavailable for this size</Text>
                            }
                        </Box>
                    </Tab>
                    <Tab title="Specifications">
                        <Box width="xlarge" overflow={{horizontal: "auto"}} margin={{ top: "medium" }}>
                            {brandname === "CAPiTA" ? <CapitaSpecsTable specs={specs}/> : <MervinSpecsTable specs={specs}/>}
                        </Box>
                    </Tab>
                    <Tab title="Technologies">
                        <Box margin={{ top: "medium" }}></Box>
                    </Tab>
                </Tabs>
            </Box>
        </Layer>
    )
}

function CapitaSpecsTable({
    specs,
    ...tableProps
}: {
    specs: {[key: string]: Spec}
} & TableProps) {
    return (
        <Table {...tableProps}>
            <TableHeader>
                <TableRow>
                    <TableCell scope="col">Size</TableCell>
                    <TableCell scope="col">Effective edge (mm)</TableCell>
                    <TableCell scope="col">Sidecut (m)</TableCell>
                    <TableCell scope="col">Nose (cm)</TableCell>
                    <TableCell scope="col">Tail (cm)</TableCell>
                    <TableCell scope="col">Waist (cm)</TableCell>
                    <TableCell scope="col">Taper (mm)</TableCell>
                    <TableCell scope="col">Ref. stance (cm)</TableCell>
                    <TableCell scope="col">Rider weight (kg)</TableCell>
                    <TableCell scope="col">Boot size</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(specs).map(([key, spec]) => (
                    <TableRow key={key}>
                        <TableCell><Text weight="bold">{key}</Text></TableCell>
                        <TableCell align="right">{spec.effectiveEdge}</TableCell>
                        <TableCell align="right">{spec.sidecut}</TableCell>
                        <TableCell align="right">{spec.noseWidth}</TableCell>
                        <TableCell align="right">{spec.tailWidth}</TableCell>
                        <TableCell align="right">{spec.waistWidth}</TableCell>
                        <TableCell align="right">{spec.taper}</TableCell>
                        <TableCell align="right">{spec.referenceStance}</TableCell>
                        <TableCell align="right">{spec.weightMin}–{spec.weightMax}</TableCell>
                        <TableCell>{spec.bootSize}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function MervinSpecsTable({
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

const AnchorLink: React.FC<AnchorLinkProps> = (props) => {
    return (
        <Anchor
            as={({ colorProp, hasIcon, hasLabel, focus, ...rest }) => <Link {...rest} />}
            {...props}
        />
    )
}
