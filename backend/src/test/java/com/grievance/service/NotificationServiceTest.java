package com.grievance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.data.domain.Pageable;

import com.grievance.dto.response.NotificationResponse;
import com.grievance.entity.Notification;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.exception.UnauthorizedException;
import com.grievance.repository.NotificationRepository;

class NotificationServiceTest {

    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final NotificationService notificationService = new NotificationService(notificationRepository);

    private User testUser;
    private User otherUser;
    private Notification testNotification;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(100L).username("test_student").role(Role.USER).build();
        otherUser = User.builder().id(200L).username("other_user").role(Role.USER).build();

        testNotification = Notification.builder()
                .id(1L)
                .user(testUser)
                .title("Case Update")
                .message("Your case was accepted")
                .link("/grievances/10")
                .type("IN_PROGRESS")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void sendNotificationCreatesAndSavesEntity() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        Notification result = notificationService.sendNotification(
                testUser, "Title", "Message", "/link", "GRIEVANCE_SUBMITTED");

        assertNotNull(result);
        assertEquals(testUser, result.getUser());
        assertEquals("Title", result.getTitle());
        assertEquals("Message", result.getMessage());
        assertEquals("/link", result.getLink());
        assertFalse(result.getIsRead());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void sendNotificationReturnsNullOnNullRecipient() {
        Notification result = notificationService.sendNotification(null, "T", "M", "/l", "TYPE");
        assertNull(result);
    }

    @Test
    void getUserNotificationsReturnsMappedResponses() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(100L), any(Pageable.class)))
                .thenReturn(List.of(testNotification));

        List<NotificationResponse> list = notificationService.getUserNotifications(100L, 10);
        assertEquals(1, list.size());
        assertEquals("Case Update", list.get(0).getTitle());
        assertEquals(1L, list.get(0).getId());
        assertFalse(list.get(0).getIsRead());
    }

    @Test
    void getUnreadCountDelegatesToRepository() {
        when(notificationRepository.countByUserIdAndIsReadFalse(100L)).thenReturn(4L);
        assertEquals(4L, notificationService.getUnreadCount(100L));
    }

    @Test
    void markAsReadSucceedsForOwner() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(testNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationResponse res = notificationService.markAsRead(1L, 100L);
        assertTrue(res.getIsRead());
        verify(notificationRepository).save(testNotification);
    }

    @Test
    void markAsReadFailsForUnauthorizedUser() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(testNotification));
        assertThrows(UnauthorizedException.class, () -> notificationService.markAsRead(1L, 200L));
    }

    @Test
    void markAllAsReadDelegatesToRepository() {
        when(notificationRepository.markAllAsReadByUserId(100L)).thenReturn(3);
        int updated = notificationService.markAllAsRead(100L);
        assertEquals(3, updated);
        verify(notificationRepository).markAllAsReadByUserId(100L);
    }
}
