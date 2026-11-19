package com.grievance.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.grievance.entity.InviteToken;

@Repository
public interface InviteTokenRepository extends JpaRepository<InviteToken, Long> {

    Optional<InviteToken> findByTokenAndAcceptedFalseAndExpiresAtAfter(String token, LocalDateTime now);

    Optional<InviteToken> findByToken(String token);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM InviteToken i WHERE i.email = :email")
    void deleteByEmail(@org.springframework.data.repository.query.Param("email") String email);
}
