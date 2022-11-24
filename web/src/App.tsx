import React, { useEffect, useState } from "react"
import { BrowserRouter, Link, LinkProps, Routes, Route, useParams} from "react-router-dom"

import { Anchor, AnchorProps, Box, Button, Grid, Grommet, Heading, Image, Main, Text } from "grommet"

import { useLiveQuery } from "dexie-react-hooks"
import { db as dexsnowboards, useSnowboards, useSeasons, populate,  Season, Brand as BrandType  } from "./db/db"

const theme = {
    global: {
        font: {
            family: 'Roboto',
            size: '18px',
            height: '20px',
        },
    },
}

function App() {
    return (
        <BrowserRouter>
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
        </BrowserRouter>
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
            <Heading level={3}>
                <AnchorLink to="/">Snowboards</AnchorLink>
                <Button label="Sync" onClick={() => {
                    dexsnowboards.brands.clear()
                    dexsnowboards.snowboards.clear()
                    populate()
                }}/>
            </Heading>

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

    const snowboards = useSnowboards({ brandname: brand, season }, [ brand, season ])

    const seasons = useSeasons({ brandname: brand }, [ brand ])

    return (
        <Main pad="medium">
            <Heading level={3}><AnchorLink to="/">Snowbords</AnchorLink></Heading>
            <Heading level={3} margin={{top: "none"}}>{brand}</Heading>
            {seasons &&
                <Box direction="row" gap="small" margin={{ bottom: "large" }}>
                    {seasons.map((val) => {
                        return (
                            <Box key={val}><Button primary={val === season} label={<Text size="small" weight="bold">{seasonName(val)}</Text>} size="small" href={`/${brand}/${val}`}/></Box>
                        )
                    })}
                </Box>
            }
            <Grid gap="medium" columns={["small", "small", "small", "small", "small"]}>
                {snowboards && snowboards.map(
                    ({ brandname, season, name }) => {
                        return (
                            <Box key={`${brandname}-${season}-${name}`} gap="small">
                                <Box width="small" height="small">
                                    <Image
                                        fit="contain"
                                        src={`/snowboards/${brandname}/${season}/${name}/${brandname}_${season}_${name}.jpg`}
                                        fallback="/snowboards/blank.png"
                                    />    
                                </Box>
                                <Box align="center">{name}</Box>
                            </Box>
                        )
                    }
                )}
            </Grid>
        </Main>
    )
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