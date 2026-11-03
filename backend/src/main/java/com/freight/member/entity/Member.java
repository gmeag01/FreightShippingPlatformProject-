package com.freight.member.entity;

import com.freight.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 회원(화주, 차주, 관리자). 로그인 계정과 역할을 담는다. */
@Getter
@Entity
@Table(name = "members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    // 이메일은 소문자로 저장한다. A@x.com과 a@x.com을 같은 계정으로 보기 위해서다(첫 주 계획 Review Focus 4).
    @Builder
    private Member(Long id, String email, String password, String name, String phone, Role role) {
        this.id = id;
        this.email = email != null ? email.toLowerCase(Locale.ROOT) : null;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.role = role;
    }
}
