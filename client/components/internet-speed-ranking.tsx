'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Clock, InfoIcon, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from 'next-themes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

const API_URL = 'http://localhost:3001/api/internet-speeds';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SpeedData {
  tile: string;
  avgDownloadSpeed: number;
  avgUploadSpeed: number;
  avgLatency: number;
  tests: number;
  devices: number;
  year: number;
  quarter: number;
}

const fetchData = async (): Promise<SpeedData[]> => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

const useInternetSpeedData = () => {
  const [data, setData] = useState<SpeedData[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDataAndUpdate = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await fetchData()
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast({
        title: "Error",
        description: `Failed to fetch data: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDataAndUpdate()
    const intervalId = setInterval(fetchDataAndUpdate, REFRESH_INTERVAL)
    return () => clearInterval(intervalId)
  }, [fetchDataAndUpdate])

  return { data, lastUpdated, isLoading, error }
}

const DataFreshnessIndicator = ({ lastUpdated }: { lastUpdated: Date }) => {
  const now = new Date()
  const timeDiff = now.getTime() - lastUpdated.getTime()
  const hoursDiff = timeDiff / (1000 * 60 * 60)

  let icon, text, tooltipText, colorClass

  if (hoursDiff < 3) {
    icon = <CheckCircle2 className="w-5 h-5" />
    text = "Recent"
    tooltipText = `Updated ${hoursDiff < 1 ? 'less than an hour' : Math.floor(hoursDiff) + ' hours'} ago`
    colorClass = "text-green-600 dark:text-green-400"
  } else if (hoursDiff < 24) {
    icon = <Clock className="w-5 h-5" />
    text = "Today"
    tooltipText = `Updated ${Math.floor(hoursDiff)} hours ago`
    colorClass = "text-yellow-600 dark:text-yellow-400"
  } else {
    icon = <AlertCircle className="w-5 h-5" />
    text = "Outdated"
    tooltipText = `Last updated on ${lastUpdated.toLocaleDateString()} at ${lastUpdated.toLocaleTimeString()}`
    colorClass = "text-red-600 dark:text-red-400"
  }

  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <span className={`flex items-center gap-1 ${colorClass}`}>
            {icon}
            <span className="font-medium">{text}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <p className="font-semibold">{data.tile}</p>
        <p>Download Speed: {data.avgDownloadSpeed.toFixed(2)} Mbps</p>
        <p>Upload Speed: {data.avgUploadSpeed.toFixed(2)} Mbps</p>
        <p>Latency: {data.avgLatency.toFixed(2)} ms</p>
        <p>Tests: {data.tests.toLocaleString()}</p>
        <p>Devices: {data.devices.toLocaleString()}</p>
        <p>Period: Q{data.quarter} {data.year}</p>
      </div>
    )
  }
  return null
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="w-10 h-10 p-2 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}

export function InternetSpeedRankingComponent() {
  const { data, lastUpdated, isLoading, error } = useInternetSpeedData()
  const [activeTab, setActiveTab] = useState('download')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500 dark:text-red-400">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Global Internet Speeds</h1>
          <nav className="flex items-center space-x-4">
            <ul className="flex space-x-4">
              <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Home</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">About</a></li>
              <li><a href="#" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a></li>
            </ul>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated ? lastUpdated.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </p>
            {lastUpdated && <DataFreshnessIndicator lastUpdated={lastUpdated} />}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Link href="/data-info" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center">
                    <InfoIcon className="w-4 h-4 ml-1" />
                    <span className="sr-only">More info about data collection</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Learn more about our data collection and update process</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Data refreshes automatically every 5 minutes
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Top 10 Regions by Internet Speed</CardTitle>
              <CardDescription>Average speeds in Mbps</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">Loading...</div>
              ) : (
                <Tabs defaultValue="download" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="download">Download Speed</TabsTrigger>
                    <TabsTrigger value="upload">Upload Speed</TabsTrigger>
                  </TabsList>
                  <TabsContent value="download">
                    <div className="h-[400px] sm:h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 'dataMax + 20']} />
                          <YAxis 
                            dataKey="tile" 
                            type="category" 
                            width={100}
                            tick={({ x, y, payload }) => (
                              <text x={-5} y={y} dy={4} textAnchor="end" fill="currentColor" fontSize={12}>
                                {payload.value}
                              </text>
                            )}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="avgDownloadSpeed" fill="var(--primary)" barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  <TabsContent value="upload">
                    <div className="h-[400px] sm:h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 'dataMax + 20']} />
                          <YAxis 
                            dataKey="tile" 
                            type="category" 
                            width={100}
                            tick={({ x, y, payload }) => (
                              <text x={-5} y={y} dy={4} textAnchor="end" fill="currentColor" fontSize={12}>
                                {payload.value}
                              </text>
                            )}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="avgUploadSpeed" fill="var(--primary)" barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Detailed Region Rankings</CardTitle>
              <CardDescription>Internet speed rankings and details</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">Loading...</div>
              ) : (
                <div className="max-h-[400px] sm:max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead className="w-32 text-right">Download (Mbps)</TableHead>
                        <TableHead className="w-32 text-right">Upload (Mbps)</TableHead>
                        <TableHead className="w-32 text-right">Latency (ms)</TableHead>
                        <TableHead className="w-32 text-right">Tests</TableHead>
                        <TableHead className="w-32 text-right">Devices</TableHead>
                        <TableHead className="w-32 text-right">Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((item, index) => (
                        <TableRow key={item.tile}>
                          <TableCell>{index + 1}</TableCell>
                          
                          <TableCell>{item.tile}</TableCell>
                          <TableCell className="text-right">{item.avgDownloadSpeed.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.avgUploadSpeed.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.avgLatency.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.tests.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.devices.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">Q{item.quarter} {item.year}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400">&copy; 2024 Global Internet Speed Monitor. All rights reserved.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}