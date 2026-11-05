package com.freight.member.repository;

import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 회원 저장소. */
public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT m FROM Member m WHERE "
            + "(:role IS NULL OR m.role = :role) AND "
            + "(:status IS NULL OR m.status = :status) AND "
            + "(:keyword IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + " OR LOWER(m.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Member> findMembersByFilter(
            @Param("role") Role role,
            @Param("status") MemberStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);
}
