package com.grievance.repository;

import com.grievance.entity.GrievanceUpvote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GrievanceUpvoteRepository extends JpaRepository<GrievanceUpvote, Long> {
    
    boolean existsByGrievanceIdAndUserId(Long grievanceId, Long userId);
    
    Optional<GrievanceUpvote> findByGrievanceIdAndUserId(Long grievanceId, Long userId);
    
    int countByGrievanceId(Long grievanceId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM GrievanceUpvote gu WHERE gu.user.id = :userId")
    void deleteByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
