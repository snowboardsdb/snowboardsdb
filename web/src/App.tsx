import React, { useEffect, useState } from "react"
import { HashRouter, Link, LinkProps, Routes, Route, useParams} from "react-router-dom"

import { Anchor, AnchorProps, Box, BoxExtendedProps, Button, Grid, Grommet, Heading, Image, Layer, LayerExtendedProps, Main, RadioButtonGroup, RadioButtonGroupExtendedProps, Text } from "grommet"
import { Table, TableHeader, TableRow, TableCell, TableBody, TableProps } from "grommet"
import { FormClose, LinkPrevious } from "grommet-icons"

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
                if (name && !acc.includes(name[0].toUpperCase())) {
                    acc.push(name[0].toUpperCase())
                }

                return acc
            }, [] as string[]))
        }

    }, [ brandnames ])

    useEffect(() => {
        setLetters(brands.reduce((acc, { name }) => {
            if (name && !acc.includes(name[0].toUpperCase())) {
                acc.push(name[0].toUpperCase())
            }

            return acc
        }, [] as string[]))
    }, [ brands ])

    const hasSnowboards = useLiveQuery(() => dexsnowboards.snowboards.orderBy("brandname").uniqueKeys())

    return (
        <Main pad="medium">
            <Box direction="row" height="xxsmall" margin={{ vertical: "medium" }} pad={{ horizontal: "large" }}>
                <Heading level={3} alignSelf="center" margin={{ vertical: "none" }}>
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
                                {brands.filter(({ name }) => name[0].toUpperCase() === letter).map(({ name }) => {
                                    return (
                                        <Box key={name}>
                                            {hasSnowboards?.includes(name) ?
                                                <AnchorLink to={`/${name}/W2022_2023`} size="large">{name}</AnchorLink> :
                                                <Text size="large" color="dark-3">{name}</Text>
                                            }
                                        </Box>
                                    )
                                })}
                            </Grid>
                        </Grid>
                    )
                })}
            </Grid>
        </Main>
    )
}

function Brand() {
    const { brand, season } = useParams()

    const [ filter, setFilter ] = useState<{ brandname?: string, season?: string, riders?: string, }>({ brandname: brand, season })

    const snowboards = useSnowboards(filter, [ filter ])

    const seasons = useSeasons({ brandname: brand }, [ brand ])

    const [ pickedSnowboard, setPickedSnowboard ] = useState<Snowboard | undefined>()

    return (
        <Main pad="medium">
            <Box direction="row" margin={{ vertical: "medium" }} height="xxsmall">
                <Button icon={<LinkPrevious/>} href="/"/>
                <Heading level={3} margin="none" alignSelf="center" color="brand">{brand}</Heading>
            </Box>

            <Box direction="row" margin={{ bottom: "large" }} pad={{ horizontal: "large" }} gap="large">
                {seasons &&
                    <Box direction="row" gap="small">
                        {seasons.map((val) => {
                            return (
                                <AnchorLink to={`/${brand}/${val}`}
                                    label={
                                        <Box key={val} background="brand" pad={{ vertical: "xsmall", horizontal: "medium"}} round="medium">
                                            <Text size="small" weight="bold">{seasonName(val)}</Text>
                                        </Box>
                                    }
                                />
                            )
                        })}
                    </Box>
                }

                <Riders onChangeRiders={(riders: string) => setFilter({ ...filter, riders })}/>
            </Box>

            <Grid gap="medium" columns="small">
                {snowboards && snowboards.map(
                    (snowboard) => {
                        const { brandname, season, name, sizes } = snowboard

                        return (
                            <Box
                                key={`${brandname}-${season}-${name}`}
                                gap="small"
                                onClick={() => setPickedSnowboard(snowboard)}
                            >
                                <Box width="small" height="small">
                                    <Image
                                        fit="contain"
                                        src={`/snowboards/${brandname}/${season}/${name}/${brandname}_${season}_${name}.jpg`}
                                        fallback="/snowboards/blank.png"
                                    />    
                                </Box>
                                <Box align="center">{name}</Box>
                                <Box direction="row" wrap justify="center">
                                    {sizes.map(size => {
                                        return (
                                            <Box
                                                key={size}
                                                pad={{horizontal: "xsmall"}}
                                                background="light-3"
                                                round="small"
                                                margin="xxsmall"
                                            >
                                                <Text size="small" color="dark-2">{size}</Text>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>
                        )
                    }
                )}
            </Grid>

            {pickedSnowboard && pickedSnowboard.specs &&
                <SnowboardLayer
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
    snowboard: { brandname, name, season, specs },
    onClickClose,
    ...layerProps
}: {
    snowboard: Snowboard,
    onClickClose?: () => void,
} & LayerExtendedProps) {
    return (
        <Layer {...layerProps}>
            <Box pad="medium" gap="medium" fill>
                <Box direction="row" justify="between" align="center">
                    <Heading level={3} margin="none">{brandname} {name} {season.replace(/W\d{4}_(\d{4})/, "$1")}</Heading>
                    <Button icon={ <FormClose/> } onClick={onClickClose}/>
                </Box>
                <Box width="xlarge">
                    <MervinSpecsTable specs={specs}/>
                </Box>
            </Box>
        </Layer>
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
                    <TableCell size="xxsmall">Size</TableCell>
                    <TableCell align="center">Contact Length</TableCell>
                    <TableCell align="center">Side Cut</TableCell>
                    <TableCell align="center">Nose Width</TableCell>
                    <TableCell align="center">Tail Width</TableCell>
                    <TableCell align="center">Waist Width</TableCell>
                    <TableCell align="center">Stance</TableCell>
                    <TableCell align="center">Set Back</TableCell>
                    <TableCell align="center">Flex</TableCell>
                    <TableCell align="center">Riders Weight</TableCell>
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
                            <TableCell><Text weight="bold">{size}{wide && "W"}</Text></TableCell>
                            <TableCell align="right">{contactLength}</TableCell>
                            <TableCell align="right">{sidecut}</TableCell>
                            <TableCell align="right">{noseWidth.toLocaleString()}</TableCell>
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
    onChangeRiders,
    ...props
}: {
    onChangeRiders?: (val: string) => void,
} & BoxExtendedProps) {
    const [value, setValue] = useState<string>("")

    return (
        <RadioButtonGroup
            {...props}
            name="riders"
            direction="row"
            gap="xsmall"
            options={["MEN", "WOMEN", "YOUTH"]}
            value={value}
            onChange={(event) => {
                setValue(event.target.value)
                onChangeRiders && onChangeRiders(event.target.value)
            }}
        >
            {(option: string, { checked, focus, hover }: { checked: boolean, focus: boolean, hover: boolean }) => {
                let background;
                if (checked) background = 'brand';
                else if (hover) background = 'light-4';
                else if (focus) background = 'light-4';
                else background = 'light-2';
                return (
                    // <Box background={background} pad="xsmall">{option}</Box>
                    <Box background={background} pad={{ vertical: "xsmall", horizontal: "medium"}} round="medium">
                        <Text size="small" weight="bold">{option}</Text>
                    </Box>
                );
            }}
        </RadioButtonGroup>
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