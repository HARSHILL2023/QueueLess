import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import adminAPI from '../services/adminApi';
import { Panel, StatCard, SkeletonGrid, ErrorPanel, EmptyState, Loading, StatusBadge } from './components/UI';
import { formatNumber } from './format';
import { LineChart, BarChart, DonutChart, HorizontalBarList, ChartLegend, PALETTE } from './components/Charts';

const WINDOWS = [7, 14, 30, 90];

export default function AdminOverview() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-overview', days],
    queryFn: async () => (await adminAPI.getOverview(days)).data.data,
  });

  if (isLoading) {
    return (
      <>
        <header className="admin-topbar">
          <div>
            <h2>Platform overview</h2>
            <p>Loading live platform metrics…</p>
          </div>
        </header>
        <SkeletonGrid count={8} />
        <div style={{ marginTop: 16 }}>
          <SkeletonGrid count={3} />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <header className="admin-topbar">
          <div>
            <h2>Platform overview</h2>
            <p>Live platform-wide activity and health.</p>
          </div>
        </header>
        <ErrorPanel
          message={error?.response?.data?.error || error?.message || 'Unable to load platform metrics.'}
          onRetry={refetch}
        />
      </>
    );
  }

  const { stats, series, hospitalActivity, departmentActivity } = data;
  const tokenStatus = [
    { label: 'Completed', value: stats.completedTokens, color: PALETTE[2] },
    { label: 'Waiting', value: stats.waitingTokens, color: PALETTE[0] },
    { label: 'Serving', value: stats.servingTokens, color: PALETTE[1] },
    { label: 'Cancelled', value: stats.cancelledTokens, color: PALETTE[4] },
    { label: 'No-show', value: stats.noShowTokens, color: '#94a3b8' },
  ];

  const hasTokenActivity = series.tokensGenerated.some((value) => value > 0);
  const hasPatientActivity = series.patientRegistrations.some((value) => value > 0);

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h2>Platform overview</h2>
          <p>
            Live platform-wide activity across every hospital, department and patient account.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="admin-chart-days">
            {WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                className={days === window ? 'active' : ''}
                onClick={() => setDays(window)}
              >
                {window}d
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className="admin-stat-grid">
        <StatCard label="Total hospitals" value={formatNumber(stats.totalHospitals)} meta={`${formatNumber(stats.activeHospitals)} active`} />
        <StatCard
          label="Pending approvals"
          value={formatNumber(stats.pendingHospitals)}
          meta={stats.pendingHospitals > 0 ? 'Needs review' : 'Nothing waiting'}
          accent="linear-gradient(90deg, #fbbf24, transparent 70%)"
        />
        <StatCard
          label="Suspended hospitals"
          value={formatNumber(stats.suspendedHospitals)}
          meta="Currently offline"
          accent="linear-gradient(90deg, #f87171, transparent 70%)"
        />
        <StatCard label="Registered patients" value={formatNumber(stats.totalPatients)} meta={`${formatNumber(stats.suspendedAccounts)} suspended accounts`} />
        <StatCard label="Hospital staff" value={formatNumber(stats.totalStaff)} meta={`${formatNumber(stats.totalHospitalAdmins)} hospital admins`} />
        <StatCard label="Departments" value={formatNumber(stats.totalDepartments)} meta={`${formatNumber(stats.totalDoctors)} doctors listed`} />
        <StatCard
          label="Tokens generated"
          value={formatNumber(stats.totalTokens)}
          meta={`${formatNumber(stats.completedTokens)} completed`}
          accent="linear-gradient(90deg, #818cf8, transparent 70%)"
        />
        <StatCard
          label="Patients treated"
          value={formatNumber(stats.completedTokens)}
          meta="Completed consultations"
          accent="linear-gradient(90deg, #34d399, transparent 70%)"
        />
        <StatCard label="Waiting now" value={formatNumber(stats.waitingTokens)} meta="In virtual queues" accent="linear-gradient(90deg, #38bdf8, transparent 70%)" />
        <StatCard label="Serving now" value={formatNumber(stats.servingTokens)} meta="Called or in consultation" />
        <StatCard
          label="Cancelled tokens"
          value={formatNumber(stats.cancelledTokens)}
          meta="Cancelled by patients"
          accent="linear-gradient(90deg, #f87171, transparent 70%)"
        />
        <StatCard label="No-shows" value={formatNumber(stats.noShowTokens)} meta="Missed consultations" />
      </div>

      <div className="admin-chart-grid">
        <Panel
          title="Tokens generated over time"
          subtitle={`Last ${series.labels.length} days · completed, cancelled and no-show tokens`}
          actions={<ChartLegend series={[{ name: 'Generated', color: PALETTE[0] }, { name: 'Completed', color: PALETTE[2] }, { name: 'Cancelled', color: PALETTE[4] }]} />}
        >
          {hasTokenActivity ? (
            <LineChart
              labels={series.labels}
              series={[
                { name: 'Generated', color: PALETTE[0], values: series.tokensGenerated },
                { name: 'Completed', color: PALETTE[2], values: series.completedTokens },
                { name: 'Cancelled', color: PALETTE[4], values: series.cancelledTokens },
              ]}
            />
          ) : (
            <EmptyState title="No tokens in this window">Queue activity will appear here as patients book tokens.</EmptyState>
          )}
        </Panel>

        <Panel title="Token status mix" subtitle="All-time distribution">
          <DonutChart items={tokenStatus} centerLabel="Tokens" />
        </Panel>
      </div>

      <div className="admin-chart-grid">
        <Panel title="Patient registrations" subtitle="New patient accounts per day">
          {hasPatientActivity ? (
            <LineChart
              labels={series.labels}
              series={[{ name: 'Registrations', color: PALETTE[1], values: series.patientRegistrations }]}
            />
          ) : (
            <EmptyState title="No new registrations">New patient sign-ups will show up here.</EmptyState>
          )}
        </Panel>

        <Panel title="Hospital growth" subtitle="Cumulative hospitals on the platform">
          <LineChart
            labels={series.labels}
            series={[{ name: 'Hospitals', color: PALETTE[5], values: series.hospitalGrowth }]}
            area
          />
        </Panel>
      </div>

      <div className="admin-chart-grid">
        <Panel title="Completed vs cancelled" subtitle="Daily consultation outcomes">
          {hasTokenActivity ? (
            <BarChart
              labels={series.labels}
              series={[
                { name: 'Completed', color: PALETTE[2], values: series.completedTokens },
                { name: 'Cancelled', color: PALETTE[4], values: series.cancelledTokens },
                { name: 'No-show', color: '#94a3b8', values: series.noShowTokens },
              ]}
            />
          ) : (
            <EmptyState title="No outcomes yet">Completion and cancellation data will appear here.</EmptyState>
          )}
        </Panel>

        <Panel title="Most active hospitals" subtitle="Ranked by lifetime tokens">
          <HorizontalBarList
            items={hospitalActivity.map((hospital) => ({
              label: `${hospital.name}`,
              value: hospital.total,
              color: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            }))}
          />
        </Panel>
      </div>

      <Panel
        title="Hospital-wise platform activity"
        subtitle="Every hospital with recorded queue activity"
        actions={<Link to="/admin/hospitals" className="admin-btn admin-btn-sm">Manage hospitals →</Link>}
        className="admin-section-stack"
      >
        {hospitalActivity.length === 0 ? (
          <EmptyState title="No hospital activity yet">Tokens booked at any hospital will appear here.</EmptyState>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>City</th>
                  <th>Status</th>
                  <th className="admin-numeric">Today</th>
                  <th className="admin-numeric">Total</th>
                  <th className="admin-numeric">Completed</th>
                  <th className="admin-numeric">Waiting</th>
                  <th className="admin-numeric">Cancelled</th>
                  <th className="admin-numeric">No-show</th>
                </tr>
              </thead>
              <tbody>
                {hospitalActivity.map((hospital) => (
                  <tr key={hospital.hospitalId}>
                    <td>
                      <Link to={`/admin/hospitals/${hospital.hospitalId}`} className="admin-cell-strong">
                        {hospital.name}
                      </Link>
                      <div className="admin-cell-muted">{hospital.code}</div>
                    </td>
                    <td>{hospital.city || '—'}</td>
                    <td>
                      <StatusBadge status={hospital.status} />
                    </td>
                    <td className="admin-numeric">{formatNumber(hospital.today)}</td>
                    <td className="admin-numeric">{formatNumber(hospital.total)}</td>
                    <td className="admin-numeric">{formatNumber(hospital.completed)}</td>
                    <td className="admin-numeric">{formatNumber(hospital.waiting)}</td>
                    <td className="admin-numeric">{formatNumber(hospital.cancelled)}</td>
                    <td className="admin-numeric">{formatNumber(hospital.noShow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div style={{ marginTop: 16 }}>
        <Panel title="Department-wise queue statistics" subtitle="Top departments by lifetime tokens">
          {departmentActivity.length === 0 ? (
            <EmptyState title="No department activity yet">Department queues will appear here once patients book tokens.</EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Hospital</th>
                    <th className="admin-numeric">Total</th>
                    <th className="admin-numeric">Waiting</th>
                    <th className="admin-numeric">Serving</th>
                    <th className="admin-numeric">Completed</th>
                    <th className="admin-numeric">Cancelled</th>
                    <th className="admin-numeric">No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentActivity.map((department) => (
                    <tr key={`${department.departmentId}-${department.hospitalId}`}>
                      <td>
                        <span className="admin-cell-strong">{department.name}</span>
                        <div className="admin-cell-muted">{department.code}</div>
                      </td>
                      <td>{department.hospitalName}</td>
                      <td className="admin-numeric">{formatNumber(department.total)}</td>
                      <td className="admin-numeric">{formatNumber(department.waiting)}</td>
                      <td className="admin-numeric">{formatNumber(department.serving)}</td>
                      <td className="admin-numeric">{formatNumber(department.completed)}</td>
                      <td className="admin-numeric">{formatNumber(department.cancelled)}</td>
                      <td className="admin-numeric">{formatNumber(department.noShow)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {isFetching && (
        <div style={{ marginTop: 12 }}>
          <Loading label="Refreshing platform metrics…" />
        </div>
      )}
    </>
  );
}
