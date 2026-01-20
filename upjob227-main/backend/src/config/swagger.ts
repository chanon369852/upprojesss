import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

// FLOW START: Swagger Config (EN)
// จุดเริ่มต้น: ตั้งค่า Swagger (TH)

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'RGA Dashboard API',
    version: '1.0.0',
    description: 'RGA Dashboard Backend API Documentation',
    contact: {
      name: 'RGA Analytics',
      email: 'support@rgadashboard.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.rgadashboard.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    parameters: {
      TenantIdHeader: {
        name: 'x-tenant-id',
        in: 'header',
        required: false,
        schema: { type: 'string', format: 'uuid' },
        description:
          'Optional tenant context header. In most cases tenant is derived from the JWT. Super admin may override for debugging/ops.',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Unauthorized' },
          code: { type: 'string', example: 'UNAUTHORIZED' },
          details: { type: 'object', additionalProperties: true },
        },
      },

      DashboardOverviewResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/DashboardOverviewData' },
          meta: { type: 'object', additionalProperties: true },
        },
        example: {
          success: true,
          data: {
            realtimeMessages: [
              { id: 'impressions', label: 'Impressions', value: 125000, delta: '+12.5% from last period', positive: true },
              { id: 'clicks', label: 'Clicks', value: 4500, delta: '+3.1% from last period', positive: true },
              { id: 'conversions', label: 'Conversions', value: 210, delta: '-1.2% from last period', positive: false },
              { id: 'revenue', label: 'Revenue', value: 340000, delta: '+8.4% from last period', positive: true },
            ],
            aiSummaries: [
              { id: 'cpm', label: 'CPM', value: '2.40', delta: '+4.2% from last period', positive: false, periodLabel: 'From last period', accentColor: 'blue' },
              { id: 'ctr', label: 'CTR', value: '3.12%', delta: '+0.8% from last period', positive: true, periodLabel: 'From last period', accentColor: 'emerald' },
              { id: 'roas', label: 'ROAS', value: '3.25x', delta: '+6.0% from last period', positive: true, periodLabel: 'From last period', accentColor: 'purple' },
              { id: 'roi', label: 'ROI', value: '122.0%', delta: '+2.1% from last period', positive: true, periodLabel: 'From last period', accentColor: 'orange' },
            ],
            financial: {
              revenue: 340000,
              revenueChange: '+8.4% from last period',
              profit: 120000,
              profitChange: '+3.2% from last period',
              cost: 220000,
              costChange: '+9.1% from last period',
              roi: '54.5%',
              roiChange: '+2.1% from last period',
              breakdown: [
                { name: 'GOOGLE', value: 180000, color: '#EA4335' },
                { name: 'FACEBOOK', value: 120000, color: '#1877F2' },
              ],
              details: [
                { label: 'Total Revenue', value: 340000, delta: '+8.4% from last period', accent: 'rgba(16,185,129,0.7)' },
              ],
            },
            conversionFunnel: [
              { label: 'Impressions', value: 125000, color: '#f97316' },
              { label: 'Clicks', value: 4500, color: '#fb923c' },
              { label: 'Conversions', value: 210, color: '#facc15' },
              { label: 'Revenue', value: 340000, color: '#22c55e' },
            ],
            activeCampaigns: [],
            conversionPlatforms: [],
            ltvCac: {
              currentRatio: 2.4,
              movement: '+1.2% vs last month',
              movementLabel: 'vs last month',
              avgLtv: 5400,
              avgCac: 2200,
              trend: [{ month: 'Jan', ltv: 5200, cac: 2100, ratio: 2.5 }],
            },
          },
          meta: {
            range: '7D',
            start: '2026-01-01T00:00:00.000Z',
            end: '2026-01-07T23:59:59.999Z',
            compareStart: '2025-12-25T00:00:00.000Z',
            compareEnd: '2025-12-31T23:59:59.999Z',
            days: 7,
          },
        },
      },

      DashboardOverviewData: {
        type: 'object',
        properties: {
          realtimeMessages: { type: 'array', items: { $ref: '#/components/schemas/RealtimeMessage' } },
          aiSummaries: { type: 'array', items: { $ref: '#/components/schemas/AiSummary' } },
          financial: { $ref: '#/components/schemas/FinancialBlock' },
          conversionFunnel: { type: 'array', items: { $ref: '#/components/schemas/FunnelStep' } },
          activeCampaigns: { type: 'array', items: { type: 'object', additionalProperties: true } },
          conversionPlatforms: { type: 'array', items: { type: 'object', additionalProperties: true } },
          ltvCac: { $ref: '#/components/schemas/LtvCacBlock' },
        },
      },
      RealtimeMessage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          value: { oneOf: [{ type: 'number' }, { type: 'string' }] },
          delta: { type: 'string' },
          positive: { type: 'boolean' },
        },
      },
      AiSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          value: { type: 'string' },
          delta: { type: 'string' },
          positive: { type: 'boolean' },
          periodLabel: { type: 'string' },
          accentColor: { type: 'string' },
        },
      },
      FinancialBlock: {
        type: 'object',
        properties: {
          revenue: { type: 'number' },
          revenueChange: { type: 'string' },
          profit: { type: 'number' },
          profitChange: { type: 'string' },
          cost: { type: 'number' },
          costChange: { type: 'string' },
          roi: { type: 'string' },
          roiChange: { type: 'string' },
          breakdown: { type: 'array', items: { $ref: '#/components/schemas/NamedValue' } },
          details: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },
      NamedValue: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: 'number' },
          color: { type: 'string' },
        },
      },
      FunnelStep: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'number' },
          color: { type: 'string' },
        },
      },
      LtvCacBlock: {
        type: 'object',
        properties: {
          currentRatio: { type: 'number' },
          movement: { type: 'string' },
          movementLabel: { type: 'string' },
          avgLtv: { type: 'number' },
          avgCac: { type: 'number' },
          trend: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },

      SeoKeywordDetail: {
        type: 'object',
        properties: {
          keyword: { type: 'string', example: 'best running shoes' },
          pos: { type: 'number', example: 3.2 },
          volume: { type: 'number', example: 12000 },
          cpu: { type: 'number', example: 0 },
          traffic: { type: 'number', example: 820 },
        },
      },
      SeoIssue: {
        type: 'object',
        properties: {
          label: { type: 'string', example: 'Index coverage' },
          value: { type: 'string', example: '96%' },
          helper: { type: 'string', example: 'Based on GSC CTR' },
          positive: { type: 'boolean', example: true },
        },
      },
      SeoAuthorityScore: {
        type: 'object',
        properties: {
          label: { type: 'string', example: 'UR' },
          value: { type: 'number', example: 72 },
          helper: { type: 'string', example: 'Derived' },
        },
      },
      SeoBacklinkHighlights: {
        type: 'object',
        properties: {
          totalBacklinks: { type: 'number', example: 5400 },
          referringDomains: { type: 'number', example: 820 },
          keywords: { type: 'number', example: 230 },
          trafficCost: { type: 'string', example: '$12K' },
        },
      },
      SeoOrganicSearch: {
        type: 'object',
        properties: {
          keywords: { type: 'number', example: 230 },
          trafficCost: { type: 'string', example: '$12K' },
          traffic: { type: 'string', example: '4200' },
        },
      },

      CommerceRealtimeStat: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'revenue' },
          label: { type: 'string', example: 'Total Revenue' },
          value: { type: 'string', example: '$340K' },
          helper: { type: 'string', example: '+8.4% from last period' },
          positive: { type: 'boolean', example: true },
        },
      },
      CommerceProfitabilityItem: {
        type: 'object',
        properties: {
          label: { type: 'string', example: 'Sales Revenue' },
          value: { type: 'number', example: 340000 },
          color: { type: 'string', example: '#f97316' },
        },
      },
      CommerceRevenueTrendPoint: {
        type: 'object',
        properties: {
          month: { type: 'string', example: 'Jan' },
          revenue: { type: 'number', example: 120000 },
          orders: { type: 'number', example: 80 },
        },
      },
      CommerceCreative: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cr-001' },
          name: { type: 'string', example: 'New Year Promo Banner' },
          type: { type: 'string', example: 'Banner' },
          reach: { type: 'number', example: 45000 },
          reactions: { type: 'number', example: 1200 },
          cta: { type: 'string', example: 'Shop' },
        },
      },
      CommerceProductVideo: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'vid-001' },
          product: { type: 'string', example: 'Running Shoes X' },
          campaign: { type: 'string', example: 'Shopee 1.1 Sale' },
          platform: { type: 'string', example: 'Shopee' },
          format: { type: 'string', example: 'Vertical 9:16' },
          length: { type: 'string', example: '15s' },
          views: { type: 'number', example: 54000 },
          completionRate: { type: 'string', example: '42%' },
          ctr: { type: 'string', example: '1.8%' },
          revenue: { type: 'number', example: 42000 },
          status: { type: 'string', example: 'Active' },
        },
      },
      ProductPerformanceRow: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Running Shoes X' },
          category: { type: 'string', example: 'Footwear' },
          sales: { type: 'number', example: 120 },
          revenue: { type: 'number', example: 54000 },
          stock: { type: 'number', example: 340 },
          status: { type: 'string', example: 'BEST SELLER' },
        },
      },

      CampaignSourceSummaryStat: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'google-total' },
          label: { type: 'string', example: 'Total Campaigns' },
          value: { type: 'string', example: '10' },
          delta: { type: 'string', example: '—' },
          positive: { type: 'boolean', example: true },
        },
      },
      CampaignInsightRow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          date: { type: 'string', format: 'date' },
          status: { type: 'string', example: 'active' },
          budget: { type: 'number', example: 50000 },
          spent: { type: 'number', example: 32000 },
          conversions: { type: 'number', example: 120 },
          roi: { type: 'number', example: 28.4 },
          roas: { type: 'number', example: 3.25 },
          impressions: { type: 'number', example: 120000 },
          clicks: { type: 'number', example: 4200 },
          ctr: { type: 'number', example: 3.5 },
          cpc: { type: 'number', example: 7.62 },
          cpm: { type: 'number', example: 45.12 },
        },
      },
      CampaignSourceInsight: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'google' },
          label: { type: 'string', example: 'Google Ads' },
          logo: { type: 'string', example: 'https://cdn.simpleicons.org/google/ea4335' },
          accent: { type: 'string', example: '#ea4335' },
          summary: { type: 'array', items: { $ref: '#/components/schemas/CampaignSourceSummaryStat' } },
          campaigns: { type: 'array', items: { $ref: '#/components/schemas/CampaignInsightRow' } },
          ageRange: { type: 'array', items: { type: 'object', additionalProperties: true } },
          genderDistribution: { type: 'array', items: { type: 'object', additionalProperties: true } },
          conversionRate: { type: 'array', items: { type: 'object', additionalProperties: true } },
          adPerformance: { type: 'array', items: { type: 'object', additionalProperties: true } },
          creatives: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },

      CrmLead: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Somchai Prasert' },
          company: { type: 'string', example: 'ABC Co., Ltd.' },
          source: { type: 'string', example: 'Facebook' },
          status: { type: 'string', example: 'converted' },
          stage: { type: 'string', example: 'proposal' },
          gender: { type: 'string', example: 'male' },
          income: { type: 'number', example: 45000 },
          estimatedValue: { type: 'number', example: 120000 },
          email: { type: 'string', example: 'somchai@example.com' },
          phone: { type: 'string', example: '+66-81-234-5678' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      TrendDashboardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              trendRealtime: { type: 'array', items: { $ref: '#/components/schemas/RealtimeMessage' } },
              trendRevenueByChannel: { type: 'array', items: { type: 'object', additionalProperties: true } },
              trendSalesFunnel: { type: 'array', items: { type: 'object', additionalProperties: true } },
              trendRevenueTrend: { type: 'array', items: { type: 'object', additionalProperties: true } },
              trendLeadSources: { type: 'array', items: { type: 'object', additionalProperties: true } },
              trendSalesReps: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          meta: { type: 'object', additionalProperties: true },
        },
      },

      SeoDashboardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              seoRealtimeStats: { type: 'array', items: { $ref: '#/components/schemas/RealtimeMessage' } },
              seoSnapshots: { type: 'object', additionalProperties: true },
              seoConversionSummary: { type: 'object', additionalProperties: true },
              seoIssues: { type: 'array', items: { $ref: '#/components/schemas/SeoIssue' } },
              seoKeywordsDetailed: { type: 'array', items: { $ref: '#/components/schemas/SeoKeywordDetail' } },
              seoAuthorityScores: { type: 'array', items: { $ref: '#/components/schemas/SeoAuthorityScore' } },
              seoBacklinkHighlights: { $ref: '#/components/schemas/SeoBacklinkHighlights' },
              seoOrganicSearch: { $ref: '#/components/schemas/SeoOrganicSearch' },
              seoAnchors: { type: 'array', items: { type: 'object', additionalProperties: true } },
              seoReferringDomains: { type: 'array', items: { type: 'object', additionalProperties: true } },
              seoRightRailStats: { type: 'array', items: { type: 'object', additionalProperties: true } },
              seoUrlRatings: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          meta: { type: 'object', additionalProperties: true },
        },
      },

      CommerceOverviewResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              realtime: { type: 'array', items: { $ref: '#/components/schemas/CommerceRealtimeStat' } },
              profitability: { type: 'array', items: { $ref: '#/components/schemas/CommerceProfitabilityItem' } },
              funnel: { type: 'array', items: { $ref: '#/components/schemas/FunnelStep' } },
              revenueTrend: { type: 'array', items: { $ref: '#/components/schemas/CommerceRevenueTrendPoint' } },
              creatives: { type: 'array', items: { $ref: '#/components/schemas/CommerceCreative' } },
              productVideos: { type: 'array', items: { $ref: '#/components/schemas/CommerceProductVideo' } },
            },
          },
          meta: { type: 'object', additionalProperties: true },
        },
      },
      ProductPerformanceResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/ProductPerformanceRow' } },
          meta: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },

      CampaignInsightsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/CampaignSourceInsight' } },
          meta: { type: 'object', additionalProperties: true },
        },
      },

      CrmLeadsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/CrmLead' } },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              status: { type: 'string', nullable: true },
              stage: { type: 'string', nullable: true },
            },
          },
        },
      },

      JsonImportListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          key: { type: 'string', example: 'json_import:7cdd8e2a-7b4a-4c39-8a0f-8c74f2f3a0c1' },
          name: { type: 'string', nullable: true, example: 'my-import.json' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      JsonImportItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          key: { type: 'string' },
          value: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      JsonImportCreateRequest: {
        type: 'object',
        required: ['data'],
        properties: {
          name: { type: 'string', maxLength: 100, nullable: true, example: 'my-import.json' },
          data: {
            description: 'Any JSON object/array. Stored as-is under tenant_settings.value.data',
            oneOf: [
              { type: 'object', additionalProperties: true },
              { type: 'array', items: { type: 'object', additionalProperties: true } },
              { type: 'array', items: { type: 'string' } },
              { type: 'array', items: { type: 'number' } },
            ],
          },
        },
      },
      JsonImportListResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/JsonImportListItem' } },
        },
      },
      JsonImportGetResponse: {
        type: 'object',
        properties: {
          item: { $ref: '#/components/schemas/JsonImportItem' },
        },
      },
      JsonImportCreateResponse: {
        type: 'object',
        properties: {
          item: { $ref: '#/components/schemas/JsonImportItem' },
        },
      },
      JsonImportDeleteResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Deleted' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Campaigns', description: 'Campaign management' },
    { name: 'Metrics', description: 'Metrics and analytics' },
    { name: 'Dashboard', description: 'Dashboard overview + trend analytics (aggregated for UI)' },
    { name: 'SEO', description: 'SEO + Web analytics dashboards (GA4 + GSC aggregated)' },
    { name: 'Commerce', description: 'E-commerce analytics (product/creative/video insights)' },
    { name: 'CRM', description: 'Leads + CRM analytics' },
    { name: 'Alerts', description: 'Alert management' },
    { name: 'Integrations', description: 'Platform integrations' },
    { name: 'Reports', description: 'Report generation' },
    { name: 'AI', description: 'AI features' },
    { name: 'Settings', description: 'Tenant settings + JSON imports for onboarding/setup' },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './dist/routes/*.js', // For compiled files
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

// FLOW END: Swagger Config (EN)
// จุดสิ้นสุด: ตั้งค่า Swagger (TH)
