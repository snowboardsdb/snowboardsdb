import React, { useEffect, useRef, useState } from "react"
import { Box, Button, Text } from "grommet"
import "./SizeList.css"

export function SizeList({ sizes, name, onSelectSize }: { sizes: string[], name: string, onSelectSize?: (size: string) => void }) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [edges, setEdges] = useState({ start: false, end: false })

    const updateEdges = () => {
        const viewport = viewportRef.current
        if (!viewport) return

        const start = viewport.scrollLeft > 1
        const end = viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft > 1
        setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end })
    }

    useEffect(() => {
        updateEdges()
        const viewport = viewportRef.current
        const content = contentRef.current
        if (!viewport || !content || typeof ResizeObserver === "undefined") return

        const observer = new ResizeObserver(updateEdges)
        observer.observe(viewport)
        observer.observe(content)
        return () => observer.disconnect()
    }, [sizes])

    return (
        <div
            ref={viewportRef}
            className="snowboard-sizes"
            role="region"
            aria-label={`Sizes for ${name}`}
            tabIndex={edges.start || edges.end ? 0 : undefined}
            data-overflow-start={edges.start}
            data-overflow-end={edges.end}
            onScroll={updateEdges}
            onClick={event => event.stopPropagation()}
            onKeyDown={event => event.stopPropagation()}
        >
            <div ref={contentRef} className="snowboard-sizes-content">
                {sizes.map((size, index) => (
                    <Button key={`${index}-${size}`} plain disabled={!onSelectSize}
                        aria-label={`Open ${name}, size ${size}`} onClick={() => onSelectSize?.(size)}>
                        <Box
                            flex={false}
                            responsive={false}
                            pad={{ horizontal: "xsmall" }}
                            background="light-3"
                            round="999px"
                        >
                            <Text size="small" color="dark-2">{size}</Text>
                        </Box>
                    </Button>
                ))}
            </div>
        </div>
    )
}
