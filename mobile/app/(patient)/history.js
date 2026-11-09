import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { queueAPI } from '../../src/services/api';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await queueAPI.getHistory();
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(22, 163, 74, 0.2)', text: '#4ade80' };
      case 'cancelled':
        return { bg: 'rgba(220, 38, 38, 0.2)', text: '#f87171' };
      case 'no-show':
        return { bg: 'rgba(217, 119, 6, 0.2)', text: '#fbbf24' };
      default:
        return { bg: 'rgba(2, 132, 199, 0.2)', text: '#38bdf8' };
    }
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.tokenDisplay}>{item.tokenDisplay}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.hospitalText}>{item.hospitalId?.name || 'Hospital'}</Text>
        <Text style={styles.deptText}>
          Clinic: {item.departmentId?.name || 'Department'} ({item.departmentId?.code || 'GEN'})
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>Date: {item.date}</Text>
          {item.completedAt && (
            <Text style={styles.dateText}>
              Completed: {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading booking records...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor="#38bdf8" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Booking History</Text>
              <Text style={styles.emptyText}>You haven't completed any queue consultations yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    gap: 14,
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenDisplay: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hospitalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
  },
  deptText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
