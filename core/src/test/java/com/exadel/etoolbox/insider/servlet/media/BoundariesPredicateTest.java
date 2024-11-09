/*
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.exadel.etoolbox.insider.servlet.media;

import com.day.cq.dam.api.Rendition;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class BoundariesPredicateTest {

    @Test
    public void shouldParseTwoSidedBoundaries() {
        for (String value : new String[]{"100x100 - 600x600", "100x100: 600x600 ", "  100x100-600x600  "}) {
            BoundariesPredicate predicate = new BoundariesPredicate(value);
            BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
            Assertions.assertNotNull(boundaries);
            Assertions.assertEquals(100, boundaries.getMinWidth());
            Assertions.assertEquals(100, boundaries.getMinHeight());
            Assertions.assertEquals(600, boundaries.getMaxWidth());
            Assertions.assertEquals(600, boundaries.getMaxHeight());
        }
    }

    @Test
    public void shouldParseIncompleteBoundaries() {
        for (String value : new String[]{"100:600", "100 - 600", "100x100-600", "100x : 600x600"}) {
            BoundariesPredicate predicate = new BoundariesPredicate(value);
            BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
            Assertions.assertNotNull(boundaries);
            Assertions.assertEquals(100, boundaries.getMinWidth());
            Assertions.assertEquals(100, boundaries.getMinHeight());
            Assertions.assertEquals(600, boundaries.getMaxWidth());
            Assertions.assertEquals(600, boundaries.getMaxHeight());
        }
    }

    @Test
    public void shouldParseOneSidedBoundaries1() {
        for (String value : new String[]{"200x100 - ", "200x100:", ">= 200x100"}) {
            BoundariesPredicate predicate = new BoundariesPredicate(value);
            BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
            Assertions.assertNotNull(boundaries);
            Assertions.assertEquals(200, boundaries.getMinWidth());
            Assertions.assertEquals(100, boundaries.getMinHeight());
            Assertions.assertEquals(Integer.MAX_VALUE, boundaries.getMaxWidth());
            Assertions.assertEquals(Integer.MAX_VALUE, boundaries.getMaxHeight());
        }
        BoundariesPredicate predicate = new BoundariesPredicate(" > 200x100 ");
        BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
        Assertions.assertNotNull(boundaries);
        Assertions.assertEquals(201, boundaries.getMinWidth());
        Assertions.assertEquals(101, boundaries.getMinHeight());
        Assertions.assertEquals(Integer.MAX_VALUE, boundaries.getMaxWidth());
        Assertions.assertEquals(Integer.MAX_VALUE, boundaries.getMaxHeight());
    }

    @Test
    public void shouldParseOneSidedBoundaries2() {
        for (String value : new String[]{" - 200x100", ":200x100", "<= 200x100"}) {
            BoundariesPredicate predicate = new BoundariesPredicate(value);
            BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
            Assertions.assertNotNull(boundaries);
            Assertions.assertEquals(0, boundaries.getMinWidth());
            Assertions.assertEquals(0, boundaries.getMinHeight());
            Assertions.assertEquals(200, boundaries.getMaxWidth());
            Assertions.assertEquals(100, boundaries.getMaxHeight());
        }
        BoundariesPredicate predicate = new BoundariesPredicate("<200x100");
        BoundariesPredicate.Boundaries boundaries = predicate.getBoundaries();
        Assertions.assertNotNull(boundaries);
        Assertions.assertEquals(0, boundaries.getMinWidth());
        Assertions.assertEquals(0, boundaries.getMinHeight());
        Assertions.assertEquals(199, boundaries.getMaxWidth());
        Assertions.assertEquals(99, boundaries.getMaxHeight());
    }

    @Test
    public void shouldSelectRendition() {
        BoundariesPredicate predicate = new BoundariesPredicate("100x100-600x600");
        Assertions.assertTrue(predicate.test(getMockRendition(100, 100)));
        Assertions.assertTrue(predicate.test(getMockRendition(600, 600)));
        Assertions.assertFalse(predicate.test(getMockRendition(100, 50)));

        for (String value : new String[]{"100x100", "100x100 - ", "100x100:", ">= 100x100"}) {
            predicate = new BoundariesPredicate(value);
            Assertions.assertTrue(predicate.test(getMockRendition(100, 100)));
            Assertions.assertTrue(predicate.test(getMockRendition(600, 600)));
            Assertions.assertFalse(predicate.test(getMockRendition(100, 50)));
        }

        for (String value : new String[]{" - 600x600", ":600x600", "<= 600x600"}) {
            predicate = new BoundariesPredicate(value);
            Assertions.assertTrue(predicate.test(getMockRendition(100, 100)));
            Assertions.assertTrue(predicate.test(getMockRendition(600, 600)));
            Assertions.assertFalse(predicate.test(getMockRendition(601, 600)));
        }

        predicate = new BoundariesPredicate("<600x600");
        Assertions.assertTrue(predicate.test(getMockRendition(599, 599)));
        Assertions.assertFalse(predicate.test(getMockRendition(600, 600)));

        predicate = new BoundariesPredicate("> 100x100");
        Assertions.assertTrue(predicate.test(getMockRendition(101, 101)));
        Assertions.assertFalse(predicate.test(getMockRendition(100, 100)));
    }

    private static Rendition getMockRendition(int width, int height) {
        Rendition result = Mockito.mock(Rendition.class);
        Mockito.when(result.getName()).thenReturn(String.format("cq5dam.thumbnail.%d.%d.png", width, height));
        return result;
    }
}