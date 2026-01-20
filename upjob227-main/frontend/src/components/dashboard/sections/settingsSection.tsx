import React from 'react';
import SectionTitle from '../SectionTitle';

export type SettingsSectionRefs = {
  root: React.RefObject<HTMLDivElement>;
  integrations: React.RefObject<HTMLDivElement>;
  header: React.RefObject<HTMLDivElement>;
};

export type SettingsSectionProps = {
  themePanelClass: string;
  IntegrationChecklistWidgetSettings: React.ComponentType<{ containerRef?: React.RefObject<HTMLDivElement> }>;
  settingsSectionRefs: SettingsSectionRefs;
  KpiSettingsTable: React.ComponentType<any>;
  settingsData: any;
  settingsLoading: boolean;
  canManageIntegrations: boolean;
  canManageAlerts: boolean;
  canManageUsers: boolean;
  canManageBranding: boolean;
  handleUpdateKpi: (...args: any[]) => void;
  handleAddKpi: (...args: any[]) => void;
  handleRemoveKpi: (...args: any[]) => void;
  platformOptions: string[];
  ThemeBrandingCard: React.ComponentType<any>;
  applyTheme: (...args: any[]) => void;
  handleMenuChange: (...args: any[]) => void;
  handleResetBranding: (...args: any[]) => void;
  DataRefreshCard: React.ComponentType<any>;
  handleRefreshChange: (...args: any[]) => void;
  handleRefresh: (...args: any[]) => void;
  UserRolesCard: React.ComponentType<any>;
  AlertSettingsCard: React.ComponentType<any>;
  brandingTheme: { mode: string };
  handleAlertToggle: (...args: any[]) => void;
  handleAlertAddRecipient: (...args: any[]) => void;
  handleAlertRemoveRecipient: (...args: any[]) => void;
  defaultRecipientEmail: string;
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
  themePanelClass,
  IntegrationChecklistWidgetSettings,
  settingsSectionRefs,
  KpiSettingsTable,
  settingsData,
  settingsLoading,
  canManageIntegrations,
  canManageAlerts,
  canManageUsers,
  canManageBranding,
  handleUpdateKpi,
  handleAddKpi,
  handleRemoveKpi,
  platformOptions,
  ThemeBrandingCard,
  applyTheme,
  handleMenuChange,
  handleResetBranding,
  DataRefreshCard,
  handleRefreshChange,
  handleRefresh,
  UserRolesCard,
  AlertSettingsCard,
  brandingTheme,
  handleAlertToggle,
  handleAlertAddRecipient,
  handleAlertRemoveRecipient,
  defaultRecipientEmail,
}) => {

  return (
    <div ref={settingsSectionRefs.root} className="space-y-8">
      {canManageIntegrations ? (
        <IntegrationChecklistWidgetSettings containerRef={settingsSectionRefs.integrations} />
      ) : null}
      <section ref={settingsSectionRefs.header} className={`${themePanelClass} scroll-mt-28`}>
        <SectionTitle title="Settings" subtitle="Track and optimize your marketing campaigns" />

        {canManageAlerts ? (
          <KpiSettingsTable
            settingsData={settingsData}
            settingsLoading={settingsLoading}
            onUpdateKpi={handleUpdateKpi}
            onAddKpi={handleAddKpi}
            onRemoveKpi={handleRemoveKpi}
            platformOptions={platformOptions}
          />
        ) : null}

        {canManageBranding || canManageIntegrations ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {canManageBranding ? (
              <ThemeBrandingCard
                settingsData={settingsData}
                onSelectTheme={applyTheme}
                onMenuChange={handleMenuChange}
                onResetBranding={handleResetBranding}
              />
            ) : null}
            {canManageIntegrations ? (
              <DataRefreshCard
                settingsData={settingsData}
                onChangeRefresh={handleRefreshChange}
                onManualTrigger={handleRefresh}
              />
            ) : null}
          </div>
        ) : null}

        {canManageUsers || canManageAlerts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {canManageUsers ? (
              <UserRolesCard settingsData={settingsData} settingsLoading={settingsLoading} />
            ) : null}
            {canManageAlerts ? (
              <AlertSettingsCard
                settingsData={settingsData}
                themeMode={brandingTheme.mode}
                onToggle={handleAlertToggle}
                onAddRecipient={handleAlertAddRecipient}
                onRemoveRecipient={handleAlertRemoveRecipient}
                defaultRecipientEmail={defaultRecipientEmail}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default SettingsSection;
