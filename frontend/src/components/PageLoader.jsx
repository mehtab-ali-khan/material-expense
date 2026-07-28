import { Box, Spinner } from '@chakra-ui/react'

function PageLoader() {
    return (
        <Box minH="45dvh" display="flex" alignItems="center" justifyContent="center">
            <Spinner size="md" color="gray.700" />
        </Box>
    )
}

export default PageLoader
