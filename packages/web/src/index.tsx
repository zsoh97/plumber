import { createRoot } from 'react-dom/client'
import ApolloProvider from 'components/ApolloProvider'
import IntlProvider from 'components/IntlProvider'
import Router from 'components/Router'
import SnackbarProvider from 'components/SnackbarProvider'
import ThemeProvider from 'components/ThemeProvider'
import { AuthenticationProvider } from 'contexts/Authentication'
import routes from 'routes'

import reportWebVitals from './reportWebVitals'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Unable to find root element')
}
const root = createRoot(container)

root.render(
  <SnackbarProvider>
    <AuthenticationProvider>
      <ApolloProvider>
        <IntlProvider>
          <ThemeProvider>
            <Router>{routes}</Router>
          </ThemeProvider>
        </IntlProvider>
      </ApolloProvider>
    </AuthenticationProvider>
  </SnackbarProvider>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
