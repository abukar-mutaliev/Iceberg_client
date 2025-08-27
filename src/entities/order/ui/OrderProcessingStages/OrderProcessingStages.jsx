import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  STAGE_STATUS_COLORS,
  PROCESSING_STAGES,
  PROCESSING_STAGE_COLORS,
  PROCESSING_STAGE_LABELS,
  PROCESSING_STAGE_ICONS,
  STAGE_STATUS,
  STAGE_STATUS_LABELS
} from "@entities/order/lib/constants";

export const OrderProcessingStages = ({ 
  stages = [], 
  onStagePress, 
  currentStage = null,
  showDetails = true,
  compact = false,
  style = {}
}) => {
  const sortedStages = useMemo(() => {
    const stageOrder = [
      PROCESSING_STAGES.ORDER_RECEIVED,
      PROCESSING_STAGES.PICKING,
      PROCESSING_STAGES.PACKING,
      PROCESSING_STAGES.QUALITY_CHECK,
      PROCESSING_STAGES.READY_FOR_DELIVERY,
      PROCESSING_STAGES.IN_DELIVERY,
      PROCESSING_STAGES.DELIVERED
    ];

    return stages.sort((a, b) => {
      const aIndex = stageOrder.indexOf(a.stage);
      const bIndex = stageOrder.indexOf(b.stage);
      return aIndex - bIndex;
    });
  }, [stages]);

  const renderStage = (stage) => {
    const isCompleted = stage.completedAt !== null;
    const isCurrent = stage.stage === currentStage;
    const isDelayed = stage.isDelayed;
    const isInProgress = stage.status === STAGE_STATUS.IN_PROGRESS;
    const isPending = stage.status === STAGE_STATUS.PENDING;

    return (
      <TouchableOpacity
        key={stage.id}
        style={[
          styles.stageItem,
          isCompleted && styles.completedStage,
          isCurrent && styles.currentStage,
          isDelayed && styles.delayedStage,
          compact && styles.compactStage
        ]}
        onPress={() => onStagePress?.(stage)}
        disabled={!onStagePress}
      >
        <View style={styles.stageHeader}>
          <View style={[
            styles.stageIndicator, 
            { backgroundColor: PROCESSING_STAGE_COLORS[stage.stage] }
          ]} />
          <Text style={styles.stageIcon}>
            {PROCESSING_STAGE_ICONS[stage.stage]}
          </Text>
          <View style={styles.stageTitleContainer}>
            <Text style={[
              styles.stageLabel, 
              isCompleted && styles.completedText
            ]}>
              {PROCESSING_STAGE_LABELS[stage.stage]}
            </Text>
            <View style={styles.stageStatusContainer}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: STAGE_STATUS_COLORS[stage.status] }
              ]} />
              <Text style={styles.statusLabel}>
                {STAGE_STATUS_LABELS[stage.status]}
              </Text>
            </View>
          </View>
        </View>

        {showDetails && (
          <View style={styles.stageDetails}>
            {stage.assignedTo && (
              <Text style={styles.assignedTo}>
                Назначен: {stage.employee?.user?.name || 'Неизвестно'}
              </Text>
            )}
            {stage.startedAt && (
              <Text style={styles.stageTime}>
                Начало: {new Date(stage.startedAt).toLocaleTimeString()}
              </Text>
            )}
            {stage.completedAt && (
              <Text style={styles.stageTime}>
                Завершение: {new Date(stage.completedAt).toLocaleTimeString()}
              </Text>
            )}
            {stage.notes && (
              <Text style={styles.stageNotes}>{stage.notes}</Text>
            )}
            {stage.isDelayed && stage.delayReason && (
              <Text style={styles.delayReason}>
                Задержка: {stage.delayReason}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Этапы обработки заказа</Text>
      <ScrollView 
        style={styles.stagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {sortedStages.length === 0 ? (
          <Text style={styles.noStages}>Нет этапов обработки</Text>
        ) : (
          sortedStages.map(renderStage)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  stagesContainer: {
    maxHeight: 400
  },
  stageItem: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8
  },
  compactStage: {
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stageIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8
  },
  stageIcon: {
    fontSize: 20,
    marginRight: 8
  },
  stageTitleContainer: {
    flex: 1
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333'
  },
  stageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusLabel: {
    fontSize: 12,
    color: '#666'
  },
  stageDetails: {
    marginTop: 8,
    paddingLeft: 32
  },
  assignedTo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  stageTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  stageNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4
  },
  delayReason: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
    marginTop: 4
  },
  completedStage: {
    opacity: 0.7
  },
  completedText: {
    textDecorationLine: 'line-through'
  },
  currentStage: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
  },
  delayedStage: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545'
  },
  noStages: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20
  }
}); 