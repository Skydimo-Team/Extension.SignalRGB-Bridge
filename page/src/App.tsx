import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Card,
  EmptyState,
  Flex,
  Icon,
  IconButton,
  Input,
  SimpleGrid,
  Spinner,
  Stat,
  Switch,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AlertTriangle, Ban, CheckCircle2, Cpu, FileCode2, Monitor, RefreshCw, XCircle } from 'lucide-react'
import { bridge, type BridgeEvent, type ConnectionStatus } from './bridge'
import type { BridgeDevice, ScriptInfo } from './types'
import { onLocaleChange, t } from './i18n'

type ScriptFilter = 'all' | 'ok' | 'error' | 'disabled'
type View = 'devices' | 'scripts'

function getScriptDisplayName(script: ScriptInfo) {
  if (typeof script.name === 'string' && script.name.trim() !== '') {
    return script.name
  }

  if (typeof script.path === 'string' && script.path.trim() !== '') {
    return script.path.split(/[/\\]/).pop() ?? script.path
  }

  return t('error_label')
}

function useForceUpdate() {
  const [, setState] = useState(0)
  return useCallback(() => setState((n) => n + 1), [])
}

function useBridge() {
  const [scripts, setScripts] = useState<ScriptInfo[]>([])
  const [devices, setDevices] = useState<BridgeDevice[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const forceUpdate = useForceUpdate()

  useEffect(() => {
    const unsubEvent = bridge.subscribe((event: BridgeEvent) => {
      if (event.type === 'scripts_snapshot') {
        setScripts(event.data.scripts)
      }
      if (event.type === 'devices_snapshot') {
        setDevices(event.data.devices)
      }
    })
    const unsubStatus = bridge.subscribeStatus(setStatus)
    const unsubLocale = onLocaleChange(() => forceUpdate())
    bridge.connect()
    return () => {
      unsubEvent()
      unsubStatus()
      unsubLocale()
      bridge.disconnect()
    }
  }, [forceUpdate])

  return { scripts, devices, status }
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const connected = status === 'connected'
  return (
    <Badge
      px="2.5"
      py="0.5"
      borderRadius="var(--radius-l)"
      fontSize="xs"
      fontWeight="500"
      bg={connected ? 'var(--badge-ok-bg)' : 'var(--badge-error-bg)'}
      color={connected ? 'var(--badge-ok-text)' : 'var(--badge-error-text)'}
    >
      <Box
        as="span"
        display="inline-block"
        w="6px"
        h="6px"
        borderRadius="full"
        bg={connected ? 'var(--badge-ok-text)' : 'var(--badge-error-text)'}
        mr="1.5"
      />
      {connected ? t('connected') : t('disconnected')}
    </Badge>
  )
}

function FilterBar({ filter, onFilter, counts }: {
  filter: ScriptFilter
  onFilter: (f: ScriptFilter) => void
  counts: Record<ScriptFilter, number>
}) {
  const filters: ScriptFilter[] = ['all', 'ok', 'error', 'disabled']
  const labels: Record<ScriptFilter, string> = {
    all: t('filter_all'),
    ok: t('filter_loaded'),
    error: t('filter_error'),
    disabled: t('filter_disabled'),
  }

  return (
    <Flex gap="1.5" flexWrap="wrap">
      {filters.map((entry) => {
        const active = filter === entry
        return (
          <Box
            key={entry}
            as="button"
            px="3"
            py="1"
            fontSize="13px"
            fontWeight="500"
            borderRadius="var(--radius-l)"
            cursor="pointer"
            transition="all 0.15s"
            border="1px solid"
            borderColor={active ? 'var(--accent-color)' : 'var(--border-subtle)'}
            bg={active ? 'var(--accent-color)' : 'transparent'}
            color={active ? 'var(--accent-text)' : 'var(--text-secondary)'}
            _hover={{
              bg: active ? 'var(--accent-hover)' : 'var(--bg-card-hover)',
            }}
            onClick={() => onFilter(entry)}
          >
            {labels[entry]} ({counts[entry]})
          </Box>
        )
      })}
    </Flex>
  )
}

function ScriptStatusIcon({ script }: { script: ScriptInfo }) {
  if (script.disabled) {
    return <Icon color="var(--text-muted)" boxSize="18px"><Ban size={18} /></Icon>
  }
  if (script.status === 'error') {
    return <Icon color="var(--color-error)" boxSize="18px"><XCircle size={18} /></Icon>
  }
  return <Icon color="var(--color-success)" boxSize="18px"><CheckCircle2 size={18} /></Icon>
}

function DeviceStatusBadge({ device }: { device: BridgeDevice }) {
  if (device.perf_state === 'running' && device.errors === 0) {
    return (
      <Badge bg="var(--badge-ok-bg)" color="var(--badge-ok-text)" borderRadius="full" px="2.5" py="0.5">
        {t('perf_running')}
      </Badge>
    )
  }

  if (device.perf_state === 'slow') {
    return (
      <Badge bg="var(--badge-warning-bg)" color="var(--badge-warning-text)" borderRadius="full" px="2.5" py="0.5">
        {t('perf_slow')}
      </Badge>
    )
  }

  if (device.perf_state === 'blocked' || device.errors > 0) {
    return (
      <Badge bg="var(--badge-error-bg)" color="var(--badge-error-text)" borderRadius="full" px="2.5" py="0.5">
        {t('perf_blocked')}
      </Badge>
    )
  }

  return (
    <Badge bg="var(--badge-idle-bg)" color="var(--badge-idle-text)" borderRadius="full" px="2.5" py="0.5">
      {t('perf_idle')}
    </Badge>
  )
}

function DeviceCard({ device }: { device: BridgeDevice }) {
  const scriptFileName = device.script_path.split(/[/\\]/).pop() ?? device.script_path
  const healthLabel = device.perf_state === 'running'
    ? t('perf_running')
    : device.perf_state === 'slow'
      ? t('perf_slow')
      : device.perf_state === 'blocked'
        ? t('perf_blocked')
        : t('perf_idle')

  return (
    <Card.Root
      variant="outline"
      bg="var(--bg-card)"
      borderColor="var(--border-subtle)"
      overflow="hidden"
      transition="all 0.15s"
      _hover={{ borderColor: 'var(--border-strong)', bg: 'var(--bg-card-hover)' }}
    >
      <Card.Body gap="4" p="4">
        <Flex gap="3" align="start" justify="space-between" flexWrap="wrap">
          <Flex gap="3" align="start" minW="0" flex="1">
            <Flex
              align="center"
              justify="center"
              w="40px"
              h="40px"
              minW="40px"
              borderRadius="var(--radius-m)"
              bg="var(--card-icon-bg)"
            >
              <Icon color="var(--accent-color)" boxSize="19px">
                <Monitor size={19} />
              </Icon>
            </Flex>

            <Box minW="0" flex="1">
              <Flex gap="2" flexWrap="wrap" align="center">
                <Text fontSize="15px" fontWeight="700" color="var(--text-primary)" truncate>
                  {device.name}
                </Text>
                <DeviceStatusBadge device={device} />
              </Flex>
              <Text mt="1" fontSize="12px" color="var(--text-muted)" truncate>
                {t('source_script', { name: device.script_name || scriptFileName })}
                {device.publisher ? ` · ${t('publisher', { pub: device.publisher })}` : ''}
              </Text>
            </Box>
          </Flex>
        </Flex>

        <Flex gap="1.5" flexWrap="wrap">
          {device.device_type && (
            <Badge
              fontSize="10.5px"
              px="1.5"
              py="0"
              borderRadius="var(--radius-s)"
              bg="var(--badge-device-bg)"
              color="var(--badge-device-text)"
              fontWeight="500"
            >
              {device.device_type}
            </Badge>
          )}
          {device.vid && (
            <Badge fontSize="10.5px" px="1.5" py="0" borderRadius="var(--radius-s)" bg="var(--badge-idle-bg)" color="var(--badge-idle-text)" fontWeight="500">
              {t('vid')}: {device.vid}
            </Badge>
          )}
          {device.pid && (
            <Badge fontSize="10.5px" px="1.5" py="0" borderRadius="var(--radius-s)" bg="var(--badge-idle-bg)" color="var(--badge-idle-text)" fontWeight="500">
              {t('pid')}: {device.pid}
            </Badge>
          )}
          <Badge fontSize="10.5px" px="1.5" py="0" borderRadius="var(--radius-s)" bg="var(--badge-idle-bg)" color="var(--badge-idle-text)" fontWeight="500">
            {t('device_outputs', { count: device.output_count })}
          </Badge>
          <Badge fontSize="10.5px" px="1.5" py="0" borderRadius="var(--radius-s)" bg="var(--badge-idle-bg)" color="var(--badge-idle-text)" fontWeight="500">
            {t('device_leds', { count: device.total_leds })}
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap="2.5">
          <Stat.Root bg="var(--bg-panel)" border="1px solid var(--border-subtle)" borderRadius="var(--radius-m)" p="3">
            <Stat.Label color="var(--text-muted)" fontSize="11px">
              {t('device_stat_fps')}
            </Stat.Label>
            <Stat.ValueText color="var(--text-primary)" fontSize="lg">
              {device.fps}
            </Stat.ValueText>
            <Stat.HelpText color="var(--text-muted)" fontSize="11px">
              {healthLabel}
            </Stat.HelpText>
          </Stat.Root>

          <Stat.Root bg="var(--bg-panel)" border="1px solid var(--border-subtle)" borderRadius="var(--radius-m)" p="3">
            <Stat.Label color="var(--text-muted)" fontSize="11px">
              {t('device_stat_render')}
            </Stat.Label>
            <Stat.ValueText color="var(--text-primary)" fontSize="lg">
              {device.render_ms}ms
            </Stat.ValueText>
            <Stat.HelpText color="var(--text-muted)" fontSize="11px">
              {t('device_avg')} · {t('perf_peak')} {device.max_render_ms}ms
            </Stat.HelpText>
          </Stat.Root>

          <Stat.Root bg="var(--bg-panel)" border="1px solid var(--border-subtle)" borderRadius="var(--radius-m)" p="3">
            <Stat.Label color="var(--text-muted)" fontSize="11px">
              {t('device_stat_topology')}
            </Stat.Label>
            <Stat.ValueText color="var(--text-primary)" fontSize="lg">
              {device.total_leds}
            </Stat.ValueText>
            <Stat.HelpText color="var(--text-muted)" fontSize="11px">
              {t('device_outputs', { count: device.output_count })} · {device.errors > 0 ? t('perf_errors', { n: device.errors }) : t('device_errors_none')}
            </Stat.HelpText>
          </Stat.Root>
        </SimpleGrid>

        <Flex gap="1.5" flexWrap="wrap" align="center">
          <Badge
            fontSize="10.5px"
            px="1.5"
            py="0.5"
            borderRadius="var(--radius-s)"
            bg="var(--badge-device-bg)"
            color="var(--badge-device-text)"
            fontWeight="600"
          >
            {device.port}
          </Badge>
          <Text fontSize="11px" color="var(--text-muted)" truncate>
            {t('device_path')}: {device.device_path || device.port}
          </Text>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function ScriptCard({ script, onToggle }: {
  script: ScriptInfo
  onToggle: (path: string, disabled: boolean) => void
}) {
  const fileName = script.path.split(/[/\\]/).pop() ?? script.path
  const displayName = getScriptDisplayName(script)
  const [showError, setShowError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showError && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [showError])

  return (
    <Card.Root
      variant="outline"
      bg="var(--bg-card)"
      borderColor="var(--border-subtle)"
      transition="all 0.15s"
      opacity={script.disabled ? 0.55 : 1}
      _hover={{ borderColor: 'var(--border-strong)', bg: 'var(--bg-card-hover)' }}
    >
      <Card.Body p="3.5">
        <Flex gap="3" align="center">
          <Flex
            align="center"
            justify="center"
            w="36px"
            h="36px"
            minW="36px"
            borderRadius="var(--radius-m)"
            bg="var(--card-icon-bg)"
          >
            <ScriptStatusIcon script={script} />
          </Flex>

          <Box flex="1" minW="0">
            <Text fontSize="13.5px" fontWeight="600" color="var(--text-primary)" truncate>
              {displayName}
            </Text>
            <Flex gap="1.5" mt="1" flexWrap="wrap" align="center">
              <Text fontSize="11.5px" color="var(--text-muted)" truncate>
                {fileName}
              </Text>
              {script.publisher && (
                <Text fontSize="11.5px" color="var(--text-muted)">
                  · {t('publisher', { pub: script.publisher })}
                </Text>
              )}
            </Flex>

            <Flex gap="1.5" mt="1.5" flexWrap="wrap">
              {script.vid && (
                <Badge
                  fontSize="10.5px"
                  px="1.5"
                  py="0"
                  borderRadius="var(--radius-s)"
                  bg="var(--badge-device-bg)"
                  color="var(--badge-device-text)"
                  fontWeight="500"
                >
                  {t('vid')}: {script.vid}
                </Badge>
              )}
              {script.device_type && (
                <Badge
                  fontSize="10.5px"
                  px="1.5"
                  py="0"
                  borderRadius="var(--radius-s)"
                  bg="var(--badge-device-bg)"
                  color="var(--badge-device-text)"
                  fontWeight="500"
                >
                  {script.device_type}
                </Badge>
              )}
              {script.has_devices && (
                <Badge
                  fontSize="10.5px"
                  px="1.5"
                  py="0"
                  borderRadius="var(--radius-s)"
                  bg="var(--badge-ok-bg)"
                  color="var(--badge-ok-text)"
                  fontWeight="500"
                >
                  <Icon mr="0.5" boxSize="11px"><Monitor size={11} /></Icon>
                  {t('has_devices')}
                </Badge>
              )}
            </Flex>
          </Box>

          {script.status === 'error' && script.error_message ? (
            <Flex align="center" gap="1.5" minW="0" flex={showError ? 1 : undefined}>
              {showError && (
                <Input
                  ref={inputRef}
                  readOnly
                  value={script.error_message}
                  size="xs"
                  fontSize="11.5px"
                  color="var(--color-error)"
                  bg="var(--bg-app)"
                  border="1px solid var(--border-subtle)"
                  borderRadius="var(--radius-s)"
                  px="2"
                  h="28px"
                  flex="1"
                  minW="0"
                  _focus={{ borderColor: 'var(--color-error)', outline: 'none' }}
                  onBlur={() => setShowError(false)}
                />
              )}
              <IconButton
                aria-label={script.error_message}
                size="xs"
                variant="ghost"
                borderRadius="var(--radius-s)"
                color="var(--color-error)"
                minW="28px"
                h="28px"
                _hover={{ bg: 'var(--badge-error-bg)' }}
                onClick={() => setShowError((value) => !value)}
              >
                <AlertTriangle size={16} />
              </IconButton>
            </Flex>
          ) : (
            <Switch.Root
              checked={!script.disabled}
              onCheckedChange={(details) => onToggle(script.path, !details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          )}
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

export default function App() {
  const { scripts, devices, status } = useBridge()
  const [view, setView] = useState<View>('devices')
  const [filter, setFilter] = useState<ScriptFilter>('all')

  const scriptCounts = useMemo(() => {
    const counts: Record<ScriptFilter, number> = { all: 0, ok: 0, error: 0, disabled: 0 }
    for (const script of scripts) {
      counts.all++
      if (script.disabled) counts.disabled++
      else if (script.status === 'error') counts.error++
      else counts.ok++
    }
    return counts
  }, [scripts])

  const deviceCounts = useMemo(() => {
    let active = 0
    let attention = 0
    for (const device of devices) {
      if (device.fps > 0) active++
      if (device.perf_state === 'slow' || device.perf_state === 'blocked' || device.errors > 0) {
        attention++
      }
    }
    return {
      total: devices.length,
      active,
      attention,
    }
  }, [devices])

  const filteredScripts = useMemo(() => {
    const list = scripts.filter((script) => {
      switch (filter) {
        case 'ok':
          return script.status === 'ok' && !script.disabled
        case 'error':
          return script.status === 'error'
        case 'disabled':
          return !!script.disabled
        default:
          return true
      }
    })

    list.sort((left, right) => {
      const leftScore = left.has_devices ? 0 : 1
      const rightScore = right.has_devices ? 0 : 1
      if (leftScore !== rightScore) {
        return leftScore - rightScore
      }

      return getScriptDisplayName(left).localeCompare(getScriptDisplayName(right))
    })

    return list
  }, [scripts, filter])

  const handleToggle = useCallback((path: string, disabled: boolean) => {
    bridge.send('toggle_script', { path, disabled })
  }, [])

  const handleRescan = useCallback(() => {
    bridge.send('rescan')
  }, [])

  const summary = view === 'devices'
    ? t('devices_stats', {
      total: deviceCounts.total,
      active: deviceCounts.active,
      attention: deviceCounts.attention,
    })
    : t('scripts_stats', {
      total: scriptCounts.all,
      ok: scriptCounts.ok,
      err: scriptCounts.error,
      dis: scriptCounts.disabled,
    })

  const hasDevices = devices.length > 0
  const hasScripts = scripts.length > 0

  return (
    <Tabs.Root
      value={view}
      onValueChange={(details) => setView(details.value as View)}
      variant="plain"
      display="flex"
      flexDirection="column"
      h="100%"
      maxH="100vh"
      overflow="hidden"
    >
      <Box
        px="5"
        pt="4"
        pb="3"
        borderBottom="1px solid var(--border-subtle)"
        bg="var(--bg-panel)"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Flex align="center" justify="space-between" gap="3" flexWrap="wrap">
          <Flex align="center" gap="3" minW="0">
            <Flex
              align="center"
              justify="center"
              w="40px"
              h="40px"
              minW="40px"
              borderRadius="var(--radius-l)"
              bg="var(--card-icon-bg)"
            >
              <Icon boxSize="20px" color="var(--accent-color)">
                {view === 'devices' ? <Monitor size={20} /> : <FileCode2 size={20} />}
              </Icon>
            </Flex>

            <Box minW="0">
              <Text fontSize="16px" fontWeight="700" color="var(--text-primary)" truncate>
                {t('title')}
              </Text>
              <Text fontSize="12px" color="var(--text-muted)" truncate>
                {summary}
              </Text>
            </Box>
          </Flex>

          <Flex align="center" gap="2" flexWrap="wrap">
            <StatusBadge status={status} />
            <Box
              as="button"
              display="flex"
              alignItems="center"
              gap="1.5"
              px="2.5"
              py="1"
              fontSize="13px"
              fontWeight="500"
              borderRadius="var(--radius-m)"
              border="1px solid var(--border-subtle)"
              bg="transparent"
              color="var(--text-secondary)"
              cursor="pointer"
              transition="all 0.15s"
              _hover={{ bg: 'var(--bg-card-hover)', color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
              onClick={handleRescan}
            >
              <RefreshCw size={14} />
              {t('rescan')}
            </Box>
          </Flex>
        </Flex>

        <Tabs.List
          mt="4"
          p="1"
          w="fit-content"
          bg="var(--bg-card)"
          border="1px solid var(--border-subtle)"
          borderRadius="var(--radius-l)"
          gap="1"
        >
          <Tabs.Trigger
            value="devices"
            borderRadius="var(--radius-m)"
            color="var(--text-secondary)"
            _selected={{ color: 'var(--accent-text)' }}
          >
            {t('tab_devices')} ({deviceCounts.total})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="scripts"
            borderRadius="var(--radius-m)"
            color="var(--text-secondary)"
            _selected={{ color: 'var(--accent-text)' }}
          >
            {t('tab_scripts')} ({scriptCounts.all})
          </Tabs.Trigger>
          <Tabs.Indicator borderRadius="var(--radius-m)" bg="var(--accent-color)" />
        </Tabs.List>

        {view === 'scripts' && hasScripts && (
          <Box mt="3">
            <FilterBar filter={filter} onFilter={setFilter} counts={scriptCounts} />
          </Box>
        )}
      </Box>

      <Box flex="1" overflow="auto" px="5" py="4">
        <Tabs.Content value="devices">
          {status !== 'connected' && !hasDevices ? (
            <Flex align="center" justify="center" h="100%" direction="column" gap="3">
              <Spinner size="md" color="var(--accent-color)" />
              <Text fontSize="13px" color="var(--text-muted)">
                {t('loading')}
              </Text>
            </Flex>
          ) : !hasDevices ? (
            <EmptyState.Root size="lg">
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <Cpu />
                </EmptyState.Indicator>
                <VStack textAlign="center" gap="1">
                  <EmptyState.Title>{t('no_devices_title')}</EmptyState.Title>
                  <EmptyState.Description>{t('no_devices_desc')}</EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <Flex direction="column" gap="3">
              {devices.map((device) => (
                <DeviceCard key={device.port} device={device} />
              ))}
            </Flex>
          )}
        </Tabs.Content>

        <Tabs.Content value="scripts">
          {status !== 'connected' && !hasScripts ? (
            <Flex align="center" justify="center" h="100%" direction="column" gap="3">
              <Spinner size="md" color="var(--accent-color)" />
              <Text fontSize="13px" color="var(--text-muted)">
                {t('loading')}
              </Text>
            </Flex>
          ) : !hasScripts ? (
            <EmptyState.Root size="lg">
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <FileCode2 />
                </EmptyState.Indicator>
                <VStack textAlign="center" gap="1">
                  <EmptyState.Title>{t('no_scripts_title')}</EmptyState.Title>
                  <EmptyState.Description>{t('no_scripts_desc')}</EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : filteredScripts.length === 0 ? (
            <Flex align="center" justify="center" h="120px">
              <Text fontSize="13px" color="var(--text-muted)">
                {t('no_match')}
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" gap="2.5">
              {filteredScripts.map((script) => (
                <ScriptCard key={script.path} script={script} onToggle={handleToggle} />
              ))}
            </Flex>
          )}
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  )
}
