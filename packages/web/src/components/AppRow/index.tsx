import type { IApp } from '@plumber/types'

import * as React from 'react'
import { Link } from 'react-router-dom'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import AppIcon from 'components/AppIcon'
import * as URLS from 'config/urls'
import useFormatMessage from 'hooks/useFormatMessage'

import { CardContent, Typography } from './style'

type AppRowProps = {
  application: IApp
}

const countTranslation = (value: React.ReactNode) => (
  <>
    <Typography variant="body1">{value}</Typography>
    <br />
  </>
)

function AppRow(props: AppRowProps): React.ReactElement {
  const formatMessage = useFormatMessage()
  const { name, key, primaryColor, iconUrl, connectionCount, flowCount } =
    props.application

  return (
    <Link to={URLS.APP(key)} data-test="app-row">
      <Card sx={{ mb: 1 }}>
        <CardActionArea>
          <CardContent>
            <Box>
              <AppIcon name={name} url={iconUrl} color={primaryColor} />
            </Box>

            <Box>
              <Typography variant="h6">{name}</Typography>
            </Box>

            <Box sx={{ px: 2 }}>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ display: ['none', 'inline-block'] }}
              >
                {formatMessage('app.connectionCount', {
                  count: countTranslation(connectionCount),
                })}
              </Typography>
            </Box>

            <Box sx={{ px: 2 }}>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ display: ['none', 'inline-block'] }}
              >
                {formatMessage('app.flowCount', {
                  count: countTranslation(flowCount),
                })}
              </Typography>
            </Box>

            <Box>
              <ArrowForwardIosIcon
                sx={{ color: (theme) => theme.palette.primary.main }}
              />
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Link>
  )
}

export default AppRow
