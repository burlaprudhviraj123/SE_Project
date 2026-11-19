package com.grievance.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.grievance.dto.response.NotificationResponse;
import com.grievance.entity.Notification;
import com.grievance.entity.User;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.exception.UnauthorizedException;
import com.grievance.repository.NotificationRepository;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@AllArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Notification sendNotification(User recipient, String title, String message, String link, String type) {
        if (recipient == null) {
            log.warn("Cannot send notification: recipient is null");
            return null;
        }

        Notification notification = Notification.builder()
                .user(recipient)
                .title(title)
                .message(message)
                .link(link)
                .type(type != null ? type : "SYSTEM")
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification sent to user {}: [{}] {}", recipient.getId(), type, title);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(Long userId, int limit) {
        int pageSize = Math.min(Math.max(limit, 1), 100);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, pageSize))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You are not authorized to update this notification");
        }

        notification.setIsRead(true);
        Notification updated = notificationRepository.save(notification);
        return mapToResponse(updated);
    }

    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadByUserId(userId);
    }

    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .link(n.getLink())
                .type(n.getType())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
