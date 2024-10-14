'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, Clock, RefreshCw, InfoIcon, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from 'next-themes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

const API_URL = 'http://localhost:3001/api/internet-speeds';

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
  }, [])

  useEffect(() => {
    fetchDataAndUpdate()
  }, [fetchDataAndUpdate])

  return { data, lastUpdated, isLoading, error, refreshData: fetchDataAndUpdate }
}

// ... (DataFreshnessIndicator, CustomTooltip, and ThemeToggle components remain unchanged)

export function InternetSpeedRankingComponent() {
  const { data, lastUpdated, isLoading, error, refreshData } = useInternetSpeedData()
  const [activeTab, setActiveTab] = useState('download')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500 dark:text-red-400">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
        <Button onClick={refreshData} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* ... (header remains unchanged) */}

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
          <Button onClick={refreshData} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
        {/* ... (rest of the component remains unchanged) */}
      </main>

      {/* ... (footer remains unchanged) */}
    </div>
  )
}