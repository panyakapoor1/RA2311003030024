import { useEffect, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Typography, Tab, Tabs, Box, Card, CardContent, Chip, IconButton, CircularProgress } from '@mui/material';
import { CheckCircle, CircleOutlined, Event, Grade, Work } from '@mui/icons-material';
import { Log } from 'logging-middleware';
import { fetchNotifications, sortPriorityInbox, type Notification, type ScoredNotification } from './api';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    background: { default: '#0a1929', paper: '#132f4c' },
  },
  typography: { fontFamily: 'Inter, sans-serif' },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 12, border: '1px solid #1e4976', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } } } }
  }
});

const typeIcons = {
  Event: <Event fontSize="small" />,
  Result: <Grade fontSize="small" />,
  Placement: <Work fontSize="small" />
};

const typeColors = {
  Event: 'primary',
  Result: 'secondary',
  Placement: 'success'
} as const;

export default function App() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readState, setReadState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      await Log('frontend', 'info', 'page', 'App mounted, fetching notifications');
      const data = await fetchNotifications();
      setNotifications(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const toggleRead = async (id: string) => {
    const isNowRead = !readState[id];
    setReadState(prev => ({ ...prev, [id]: isNowRead }));
    await Log('frontend', 'debug', 'component', `Marked notification ${id} as ${isNowRead ? 'read' : 'unread'}`);
  };

  const priorityItems = useMemo(() => sortPriorityInbox(notifications).slice(0, 10), [notifications]);
  
  const displayItems = tab === 0 ? priorityItems : notifications;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom color="primary.light">
          Campus Notifications
        </Typography>
        
        <Tabs value={tab} onChange={(_, v) => { setTab(v); Log('frontend', 'debug', 'component', `Switched to tab ${v}`); }} sx={{ mb: 3 }}>
          <Tab label="Priority Inbox (Top 10)" />
          <Tab label="All Notifications" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayItems.map((n) => {
              const isRead = readState[n.ID];
              return (
                <Card key={n.ID} sx={{ opacity: isRead ? 0.6 : 1 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pb: '16px !important' }}>
                    <IconButton onClick={() => toggleRead(n.ID)} color={isRead ? 'default' : 'primary'} size="small">
                      {isRead ? <CheckCircle /> : <CircleOutlined />}
                    </IconButton>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip 
                          icon={typeIcons[n.Type as keyof typeof typeIcons]} 
                          label={n.Type} 
                          size="small" 
                          color={typeColors[n.Type as keyof typeof typeColors]} 
                          variant="outlined" 
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(n.Timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: isRead ? 'normal' : 'bold' }}>
                        {n.Message}
                      </Typography>
                      {tab === 0 && 'score' in n && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Priority Score: {(n as ScoredNotification).score.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}
