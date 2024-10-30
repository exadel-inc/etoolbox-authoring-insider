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
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ValueMap;

import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A {@link Predicate} implementation that filters {@link Rendition} objects based on their dimensions with use of the
 * provided user constraints
 */
class BoundariesPredicate implements Predicate<Rendition> {

    private static final Pattern SIZE_PATTERN = Pattern.compile("(\\d+)\\.(\\d+)(?=\\.\\w+$)");

    private static final String SEPARATOR_X = "x";
    private static final String SEPARATOR_COLON = ":";

    private final Boundaries boundaries;

    /**
     * Creates a new instance of the {@link BoundariesPredicate} class
     * @param value A {@code String} value representing the user constraints for the rendition dimensions
     */
    BoundariesPredicate(String value) {
        boundaries = forString(value);
    }

    /**
     * Tests whether the given {@link Rendition} object meets the user constraints for the rendition dimensions
     * @param rendition The {@link Rendition} object to test
     * @return True or false
     */
    @Override
    public boolean test(Rendition rendition) {
        Size size = getSize(rendition, rendition.getResourceResolver());
        return boundaries.contains(size);
    }

    private static Size getSize(Rendition rendition, ResourceResolver resolver) {
        Matcher matcher = SIZE_PATTERN.matcher(rendition.getName());
        if (matcher.find()) {
            int width = Integer.parseInt(matcher.group(1));
            int height = Integer.parseInt(matcher.group(2));
            return new Size(width, height);
        }
        Resource metadataResource = resolver.getResource(rendition.getPath() + "/jcr:content/metadata");
        ValueMap metadata = metadataResource != null ? metadataResource.adaptTo(ValueMap.class) : null;
        if (metadata == null) {
            return Size.EMPTY;
        }
        int width = metadata.get("tiff:ImageWidth", 0);
        int height = metadata.get("tiff:ImageLength", 0);
        return new Size(width, height);
    }

    private static Boundaries forString(String value) {
        if (!StringUtils.contains(value, SEPARATOR_COLON)) {
            return Boundaries.DEFAULT;
        }
        String[] parts = StringUtils.split(value, SEPARATOR_COLON);
        if (parts.length != 2 || !StringUtils.contains(parts[0], SEPARATOR_X) || !StringUtils.contains(parts[1], SEPARATOR_X)) {
            return Boundaries.DEFAULT;
        }
        String left = parts[0];
        String leftMin = StringUtils.substringBefore(left, SEPARATOR_X).trim();
        String leftMax = StringUtils.substringAfter(left, SEPARATOR_X).trim();
        if (!StringUtils.isNumeric(leftMin) || !StringUtils.isNumeric(leftMax)) {
            return Boundaries.DEFAULT;
        }

        String right = parts[1];
        String rightMin = StringUtils.substringBefore(right, SEPARATOR_X).trim();
        String rightMax = StringUtils.substringAfter(right, SEPARATOR_X).trim();
        if (!StringUtils.isNumeric(rightMin) || !StringUtils.isNumeric(rightMax)) {
            return Boundaries.DEFAULT;
        }
        return new Boundaries(
                Integer.parseInt(leftMin),
                Integer.parseInt(leftMax),
                Integer.parseInt(rightMin),
                Integer.parseInt(rightMax));
    }

    /**
     * A simple data class representing the size of an image
     */
    @RequiredArgsConstructor
    @Getter
    private static class Size {

        static final Size EMPTY = new Size(0, 0);

        private final int width;
        private final int height;

        boolean isEmpty() {
            return width == 0 || height == 0;
        }
    }

    /**
     * A simple data class representing the boundaries for the image size
     */
    @RequiredArgsConstructor
    @Getter
    private static class Boundaries {

        static final Boundaries DEFAULT = new Boundaries(0, 0, 0, 0);

        private final int minWidth;
        private final int minHeight;
        private final int maxWidth;
        private final int maxHeight;

        boolean contains(Size size) {
            if (size.isEmpty() || minWidth >= maxWidth || minHeight >= maxHeight) {
                return true;
            }
            return size.getWidth() >= minWidth
                    && size.getWidth() <= maxWidth
                    && size.getHeight() >= minHeight
                    && size.getHeight() <= maxHeight;
        }
    }
}
