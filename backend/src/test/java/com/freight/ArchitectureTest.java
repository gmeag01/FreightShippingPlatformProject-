package com.freight;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * AGENTS.md의 '반드시 지킬 것' 중 코드로 검사할 수 있는 규칙을 테스트로 막는다.
 * 아직 코드가 없는 도메인도 있으므로 검사할 클래스가 없어도 통과하게 둔다(allowEmptyShould).
 */
@AnalyzeClasses(packages = "com.freight", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    static final String[] DOMAINS = {"member", "vehicle", "fare", "order", "matching", "delivery", "payment"};

    /** 다른 도메인의 repository를 직접 쓰지 않는다. 필요하면 그 도메인의 service를 호출한다. */
    @ArchTest
    static void noCrossDomainRepositoryAccess(JavaClasses classes) {
        for (String domain : DOMAINS) {
            noClasses()
                    .that()
                    .resideOutsideOfPackage("..freight." + domain + "..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..freight." + domain + ".repository..")
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    /** 컨트롤러는 엔티티가 아니라 DTO를 반환한다. */
    @ArchTest
    static final ArchRule controllersDoNotReturnEntities = methods()
            .that()
            .areDeclaredInClassesThat()
            .resideInAPackage("..controller..")
            .and()
            .arePublic()
            .should()
            .notHaveRawReturnType(resideInAPackage("..entity.."))
            .allowEmptyShould(true);
}
